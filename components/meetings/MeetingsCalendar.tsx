import { ChevronLeft, ChevronRight } from "@tamagui/lucide-icons";
import { useMemo, useState } from "react";
import { Pressable } from "react-native";
import { ScrollView, Text, View, XStack, YStack } from "tamagui";

import { TWButton } from "@/components/ux/TWButton";
import { TWCard, TWCardBody } from "@/components/ux/TWCard";
import { TWChip } from "@/components/ux/TWChip";
import { aiqlickTokens } from "@/tamagui.config";
import type { CalendarEvent } from "@/graphql/operations/meetings";

interface Props {
  events: CalendarEvent[];
  onSelectEvent?: (e: CalendarEvent) => void;
}

/**
 * Month-grid calendar view, mirrors `MeetingsCalendar` in
 * aiqlick-frontend:
 *
 *   ◀  March 2026  ▶                                          Today
 *   ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐
 *   │ SUN  │ MON  │ TUE  │ WED  │ THU  │ FRI  │ SAT  │
 *   ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
 *   │  1   │  2   │  3   │ [4]* │  5   │  6   │  7   │ ← today highlighted
 *   │      │  ▍A  │  ▍B  │      │      │      │ +2   │ ← event chips
 *   ...
 *
 * Day-cell chips: max 2 visible, "+N" overflow indicator below.
 * Tapping a day surfaces its full event list in a side panel.
 * Recurring meetings from `metadata.recurrence` aren't yet expanded
 * client-side — backend already returns the materialised series, so
 * we just render whatever `events` we're given.
 */
export default function MeetingsCalendar({ events, onSelectEvent }: Props) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(() =>
    dayKey(new Date()),
  );

  const grid = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const byDay = useMemo(() => groupByDay(events), [events]);
  const monthLabel = cursor.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  const todayKey = dayKey(new Date());
  const selectedDayEvents =
    selectedDayKey && byDay.get(selectedDayKey)
      ? [...byDay.get(selectedDayKey)!].sort(
          (a, b) =>
            new Date(a.scheduledAt).getTime() -
            new Date(b.scheduledAt).getTime(),
        )
      : [];

  return (
    <YStack
      gap={12}
      backgroundColor={aiqlickTokens.surface}
      borderRadius={aiqlickTokens.radiusXl}
      borderWidth={1}
      borderColor={aiqlickTokens.gray200}
      padding={16}
    >
      {/* Month header */}
      <XStack alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap={4}>
          <NavButton
            icon={<ChevronLeft size={16} color={aiqlickTokens.gray700} />}
            onPress={() => setCursor((c) => shiftMonth(c, -1))}
          />
          <Text color={aiqlickTokens.gray900} fontSize={16} fontWeight="700" minWidth={140} textAlign="center">
            {monthLabel}
          </Text>
          <NavButton
            icon={<ChevronRight size={16} color={aiqlickTokens.gray700} />}
            onPress={() => setCursor((c) => shiftMonth(c, 1))}
          />
        </XStack>
        <TWButton
          label="Today"
          variant="ghost"
          color="primary"
          size="sm"
          onPress={() => {
            const now = new Date();
            setCursor(startOfMonth(now));
            setSelectedDayKey(dayKey(now));
          }}
        />
      </XStack>

      {/* Weekday header */}
      <XStack>
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
          <Text
            key={d}
            flex={1}
            color={aiqlickTokens.gray500}
            fontSize={10}
            fontWeight="700"
            letterSpacing={1}
            textAlign="center"
            paddingVertical={6}
          >
            {d}
          </Text>
        ))}
      </XStack>

      {/* 6 weeks × 7 days */}
      <YStack
        borderRadius={aiqlickTokens.radiusLg}
        overflow="hidden"
        borderWidth={1}
        borderColor={aiqlickTokens.gray200}
      >
        {grid.map((week, weekIndex) => (
          <XStack key={weekIndex}>
            {week.map((day) => (
              <DayCell
                key={day.iso}
                day={day}
                isToday={day.iso === todayKey}
                isSelected={day.iso === selectedDayKey}
                isCurrentMonth={day.month === cursor.getMonth()}
                events={byDay.get(day.iso) ?? []}
                onSelect={() => setSelectedDayKey(day.iso)}
              />
            ))}
          </XStack>
        ))}
      </YStack>

      {/* Selected-day side panel */}
      {selectedDayKey && (
        <YStack
          marginTop={8}
          gap={8}
          padding={12}
          borderRadius={aiqlickTokens.radiusLg}
          backgroundColor={aiqlickTokens.gray50}
          borderWidth={1}
          borderColor={aiqlickTokens.gray100}
        >
          <Text color={aiqlickTokens.gray700} fontSize={12} fontWeight="700">
            {formatDayHeader(selectedDayKey)}
          </Text>
          {selectedDayEvents.length === 0 ? (
            <Text color={aiqlickTokens.gray500} fontSize={12}>
              Nothing scheduled.
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 280 }}>
              <YStack gap={8}>
                {selectedDayEvents.map((e) => (
                  <DayEventRow
                    key={e.id}
                    event={e}
                    onPress={onSelectEvent ? () => onSelectEvent(e) : undefined}
                  />
                ))}
              </YStack>
            </ScrollView>
          )}
        </YStack>
      )}
    </YStack>
  );
}

function NavButton({
  icon,
  onPress,
}: {
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered }) => ({
        width: 28,
        height: 28,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor:
          pressed || hovered ? aiqlickTokens.gray100 : "transparent",
      })}
    >
      {icon}
    </Pressable>
  );
}

interface DayInfo {
  iso: string;
  date: number;
  month: number;
  year: number;
}

function DayCell({
  day,
  isToday,
  isSelected,
  isCurrentMonth,
  events,
  onSelect,
}: {
  day: DayInfo;
  isToday: boolean;
  isSelected: boolean;
  isCurrentMonth: boolean;
  events: CalendarEvent[];
  onSelect: () => void;
}) {
  const visible = events.slice(0, 2);
  const extra = events.length - visible.length;
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed, hovered }) => ({
        flex: 1,
        minHeight: 92,
        padding: 6,
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderColor: aiqlickTokens.gray100,
        backgroundColor: isSelected
          ? aiqlickTokens.primaryFaint
          : pressed || hovered
            ? aiqlickTokens.gray50
            : aiqlickTokens.surface,
      })}
    >
      <XStack justifyContent="flex-end" marginBottom={4}>
        {isToday ? (
          <View
            width={22}
            height={22}
            borderRadius={9999}
            alignItems="center"
            justifyContent="center"
            backgroundColor={aiqlickTokens.primary}
          >
            <Text color="#fff" fontSize={11} fontWeight="700">
              {day.date}
            </Text>
          </View>
        ) : (
          <Text
            color={
              isCurrentMonth ? aiqlickTokens.gray700 : aiqlickTokens.gray300
            }
            fontSize={11}
            fontWeight="600"
          >
            {day.date}
          </Text>
        )}
      </XStack>
      <YStack gap={3}>
        {visible.map((e) => (
          <EventChip key={e.id} event={e} />
        ))}
        {extra > 0 && (
          <Text color={aiqlickTokens.gray500} fontSize={9} fontWeight="600">
            +{extra} more
          </Text>
        )}
      </YStack>
    </Pressable>
  );
}

function EventChip({ event }: { event: CalendarEvent }) {
  const c = statusColor(event.status);
  return (
    <View
      paddingHorizontal={4}
      paddingVertical={2}
      borderRadius={3}
      backgroundColor={c.bg}
      borderLeftWidth={2}
      borderLeftColor={c.bar}
    >
      <Text color={c.fg} fontSize={9} fontWeight="600" numberOfLines={1}>
        {timeChip(event.scheduledAt)} {event.title || "Untitled"}
      </Text>
    </View>
  );
}

function DayEventRow({
  event,
  onPress,
}: {
  event: CalendarEvent;
  onPress?: () => void;
}) {
  const c = statusColor(event.status);
  return (
    <TWCard shadow="none" onPress={onPress}>
      <TWCardBody>
        <XStack alignItems="center" gap={10}>
          <View width={4} alignSelf="stretch" borderRadius={2} backgroundColor={c.bar} />
          <YStack flex={1} gap={2}>
            <XStack alignItems="center" gap={6} flexWrap="wrap">
              <Text color={aiqlickTokens.gray900} fontSize={13} fontWeight="600" numberOfLines={1}>
                {event.title || "Untitled"}
              </Text>
              <TWChip
                label={event.type === "INTERVIEW" ? "Interview" : "Meeting"}
                color={event.type === "INTERVIEW" ? "warning" : "primary"}
                variant="flat"
                size="sm"
              />
            </XStack>
            <Text color={aiqlickTokens.gray500} fontSize={11}>
              {new Date(event.scheduledAt).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {event.duration ? ` · ${event.duration} min` : ""}
              {event.candidateName ? ` · ${event.candidateName}` : ""}
            </Text>
          </YStack>
          <TWChip
            label={(event.status ?? "").toUpperCase() || "—"}
            color={statusChipColor(event.status)}
            variant="flat"
            size="sm"
          />
        </XStack>
      </TWCardBody>
    </TWCard>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function shiftMonth(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildMonthGrid(monthStart: Date): DayInfo[][] {
  const firstWeekday = monthStart.getDay(); // 0=Sun
  const gridStart = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth(),
    1 - firstWeekday,
  );
  const weeks: DayInfo[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: DayInfo[] = [];
    for (let d = 0; d < 7; d++) {
      const cur = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + w * 7 + d,
      );
      week.push({
        iso: dayKey(cur),
        date: cur.getDate(),
        month: cur.getMonth(),
        year: cur.getFullYear(),
      });
    }
    weeks.push(week);
  }
  return weeks;
}

function groupByDay(events: CalendarEvent[]) {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const k = dayKey(new Date(e.scheduledAt));
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(e);
  }
  return map;
}

function timeChip(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayHeader(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function statusColor(status: string | null) {
  const s = (status ?? "").toUpperCase();
  if (s === "COMPLETED")
    return { bg: "rgba(22,163,74,0.12)", bar: "#16a34a", fg: "#15803d" };
  if (s === "CANCELLED" || s === "DECLINED")
    return { bg: "rgba(220,38,38,0.10)", bar: "#dc2626", fg: "#b91c1c" };
  if (s === "IN_PROGRESS" || s === "ONGOING" || s === "RESCHEDULED")
    return { bg: "rgba(217,119,6,0.12)", bar: "#d97706", fg: "#b45309" };
  return { bg: "rgba(61,82,160,0.10)", bar: aiqlickTokens.primary, fg: aiqlickTokens.primary };
}

function statusChipColor(
  status: string | null,
): "primary" | "warning" | "success" | "danger" | "default" {
  switch ((status ?? "").toUpperCase()) {
    case "SCHEDULED":
    case "CONFIRMED":
    case "PENDING":
      return "primary";
    case "IN_PROGRESS":
    case "ONGOING":
    case "RESCHEDULED":
      return "warning";
    case "COMPLETED":
      return "success";
    case "CANCELLED":
    case "DECLINED":
      return "danger";
    default:
      return "default";
  }
}
