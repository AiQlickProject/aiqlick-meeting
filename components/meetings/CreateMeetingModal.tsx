import { useMutation } from "@apollo/client";
import {
  AlignLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  ChevronDown,
  Globe,
  Pencil,
  Plus,
  RotateCw,
  Tag,
  Users,
  X,
} from "@tamagui/lucide-icons";
import { useRef, useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, TextInput } from "react-native";
import { Text, View, XStack, YStack } from "tamagui";

import { TWButton } from "@/components/ux/TWButton";
import { TWModal } from "@/components/ux/TWModal";
import {
  CREATE_MEETING,
  type AttendeeRole,
  type CreateMeetingAttendee,
  type CreateMeetingInput,
  type CreateMeetingResult,
  type MeetingType,
  type RecurrenceType,
} from "@/graphql/operations/createMeeting";
import { useUserAuth } from "@/contexts/UserAuthProvider";
import {
  defaultTimeZone,
  isValidHhMm,
  normalizeHhMm,
  zonedDateTimeToUtcIso,
} from "@/lib/datetime";
import { aiqlickTokens } from "@/tamagui.config";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}

const MEETING_TYPES: { value: MeetingType; label: string }[] = [
  { value: "GENERAL", label: "General" },
  { value: "ONE_ON_ONE", label: "One-on-one" },
  { value: "ALL_HANDS", label: "All hands" },
  { value: "TRAINING", label: "Training" },
  { value: "PANEL", label: "Panel" },
];

const ATTENDEE_ROLES: { value: AttendeeRole; label: string }[] = [
  { value: "PARTICIPANT", label: "Participant" },
  { value: "GUEST", label: "Guest" },
  { value: "ORGANIZER", label: "Organizer" },
];

const RECURRENCE_TYPES: { value: RecurrenceType; label: string }[] = [
  { value: "NONE", label: "Doesn't repeat" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Every 2 weeks" },
  { value: "MONTHLY", label: "Monthly" },
];

// Curated list mirrored from aiqlick-frontend's CreateMeetingModal so
// the timezone control is actually usable (the old version only ever
// offered UTC + the device zone).
const BASE_TIMEZONES: { value: string; label: string }[] = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern (US)" },
  { value: "America/Chicago", label: "Central (US)" },
  { value: "America/Denver", label: "Mountain (US)" },
  { value: "America/Los_Angeles", label: "Pacific (US)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Central Europe (CET)" },
  { value: "Europe/Stockholm", label: "Stockholm (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Europe/Helsinki", label: "Helsinki (EET)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Shanghai", label: "China (CST)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "Pacific/Auckland", label: "New Zealand (NZST)" },
];

const TIMEZONES = (() => {
  const local = defaultTimeZone();
  return BASE_TIMEZONES.some((t) => t.value === local)
    ? BASE_TIMEZONES
    : [{ value: local, label: `${local} (device)` }, ...BASE_TIMEZONES];
})();

// Teams-style time picker: 15-minute slots, friendly 12-hour labels,
// 24-hour `HH:MM` values so submit logic stays unchanged and always
// receives a valid time.
const TIME_OPTIONS: { value: string; label: string }[] = (() => {
  const out: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const period = h < 12 ? "AM" : "PM";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      out.push({ value, label: `${h12}:${String(m).padStart(2, "0")} ${period}` });
    }
  }
  return out;
})();

/**
 * Human-readable duration summary, e.g.
 *   35  → "35 minutes"
 *   75  → "1 hr 15 min"
 *   180 → "3 hours"
 */
function formatDuration(mins: number): string {
  if (!Number.isFinite(mins) || mins <= 0) return "";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h} hour${h === 1 ? "" : "s"}`;
  return `${h} hr ${m} min`;
}

function hhmmToMinutes(s: string): number {
  const [h, m] = s.split(":").map((n) => Number(n));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

function minutesToHhmm(mins: number): string {
  const wrapped = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Returns minutes between two `HH:MM` values; if `end <= start` we
 *  treat it as crossing midnight by exactly the difference (so 23:00 →
 *  01:00 is 120 min). */
function durationBetween(start: string, end: string): number {
  const a = hhmmToMinutes(start);
  const b = hhmmToMinutes(end);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
  const raw = b - a;
  return raw > 0 ? raw : raw + 24 * 60;
}

/**
 * Create-meeting modal. Four stacked sections mirroring
 * `aiqlick-frontend/components/meetings/CreateMeetingModal.tsx`:
 *
 *   1. Meeting details   — title, type, description
 *   2. When              — date, time, duration, timezone
 *   3. Repeats           — recurrence type, weekday picker, ends
 *   4. Attendees         — email + name + role + chip list
 *
 * On submit we issue `CREATE_MEETING` with the same metadata shape
 * the frontend uses so the backend records are indistinguishable
 * regardless of which client created them.
 */
export default function CreateMeetingModal({ isOpen, onClose, onCreated }: Props) {
  const { user } = useUserAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<MeetingType>("GENERAL");
  const [date, setDate] = useState<string>(today());
  const [time, setTime] = useState<string>(() => nextQuarterHour());
  const [endTime, setEndTime] = useState<string>(() =>
    minutesToHhmm(hhmmToMinutes(nextQuarterHour()) + 60),
  );
  const [timezone, setTimezone] = useState<string>(defaultTimeZone());
  const [recurrence, setRecurrence] = useState<RecurrenceType>("NONE");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [endType, setEndType] = useState<"OCCURRENCES" | "UNTIL">("OCCURRENCES");
  const [occurrences, setOccurrences] = useState<string>("10");
  const [endDate, setEndDate] = useState<string>("");
  const [attendees, setAttendees] = useState<CreateMeetingAttendee[]>([]);
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeRole, setAttendeeRole] = useState<AttendeeRole>("PARTICIPANT");
  const [error, setError] = useState<string | null>(null);
  const [attendeeError, setAttendeeError] = useState<string | null>(null);
  const [showRecurrence, setShowRecurrence] = useState(false);
  const [titleFocused, setTitleFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [descriptionFocused, setDescriptionFocused] = useState(false);

  const [createMeeting, { loading }] = useMutation<CreateMeetingResult>(CREATE_MEETING);

  const reset = () => {
    setTitle("");
    setDescription("");
    setType("GENERAL");
    const start = nextQuarterHour();
    setDate(today());
    setTime(start);
    setEndTime(minutesToHhmm(hhmmToMinutes(start) + 60));
    setTimezone(defaultTimeZone());
    setRecurrence("NONE");
    setWeekdays([]);
    setEndType("OCCURRENCES");
    setOccurrences("10");
    setEndDate("");
    setAttendees([]);
    setAttendeeEmail("");
    setAttendeeName("");
    setAttendeeRole("PARTICIPANT");
    setError(null);
    setAttendeeError(null);
    setShowRecurrence(false);
  };

  // Single close path so the X in the header, the Cancel button, and
  // backdrop dismissal all reset state identically — no stale fields
  // on next open.
  const closeAndReset = () => {
    reset();
    onClose();
  };

  const handleAddAttendee = () => {
    setAttendeeError(null);
    if (!attendeeEmail.trim()) {
      setAttendeeError("Email is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendeeEmail.trim())) {
      setAttendeeError("Enter a valid email.");
      return;
    }
    if (attendees.some((a) => a.email.toLowerCase() === attendeeEmail.toLowerCase())) {
      setAttendeeError("This email is already on the list.");
      return;
    }
    setAttendees((prev) => [
      ...prev,
      { email: attendeeEmail.trim(), name: attendeeName.trim() || undefined, role: attendeeRole },
    ]);
    setAttendeeEmail("");
    setAttendeeName("");
    setAttendeeRole("PARTICIPANT");
  };

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim()) {
      setError("Meeting title is required.");
      return;
    }
    if (!date || !time) {
      setError("Pick a date and time.");
      return;
    }
    const normalizedTime = normalizeHhMm(time);
    const normalizedEnd = normalizeHhMm(endTime);
    if (!isValidHhMm(normalizedTime) || !isValidHhMm(normalizedEnd)) {
      setError("Enter start and end as HH:MM (24-hour), e.g. 14:30.");
      return;
    }
    const durationN = durationBetween(normalizedTime, normalizedEnd);
    if (!Number.isFinite(durationN) || durationN < 15 || durationN > 480) {
      setError("End time must be 15-480 minutes after the start time.");
      return;
    }
    if (!user?.selectedCompanyId) {
      setError("Select a company before creating a meeting.");
      return;
    }
    if (
      (recurrence === "WEEKLY" || recurrence === "BIWEEKLY") &&
      weekdays.length === 0
    ) {
      setError("Pick at least one weekday for a weekly recurrence.");
      return;
    }
    if (recurrence !== "NONE" && endType === "UNTIL" && !endDate) {
      setError("Pick an end date for the recurrence.");
      return;
    }
    let scheduledAtIso: string;
    try {
      scheduledAtIso = zonedDateTimeToUtcIso(date, normalizedTime, timezone);
      if (Number.isNaN(new Date(scheduledAtIso).getTime())) {
        throw new Error("invalid");
      }
    } catch {
      setError("That date and time isn't valid.");
      return;
    }
    // Reject scheduling in the past. We allow a 1-minute grace so a
    // user finishing the form *right* at the target minute doesn't
    // get tripped up by clock drift.
    if (new Date(scheduledAtIso).getTime() < Date.now() - 60_000) {
      setError("Pick a future date and time — meetings can't be scheduled in the past.");
      return;
    }

    const recurrenceMeta = (() => {
      if (recurrence === "NONE") return undefined;
      const base = {
        type: recurrence,
        endType,
      } as const;
      const tail =
        endType === "OCCURRENCES"
          ? { occurrences: Number(occurrences) || 1 }
          : { endDate: endDate || undefined };
      const days =
        recurrence === "WEEKLY" || recurrence === "BIWEEKLY"
          ? weekdays
          : undefined;
      return {
        ...base,
        ...tail,
        ...(days && days.length > 0 ? { days } : {}),
      };
    })();

    const input: CreateMeetingInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      companyId: user?.selectedCompanyId ?? undefined,
      scheduledAt: scheduledAtIso,
      duration: durationN,
      timezone,
      attendees: attendees.length ? attendees : undefined,
      metadata: {
        createdFrom: "meeting-client",
        createdAt: new Date().toISOString(),
        ...(recurrenceMeta ? { recurrence: recurrenceMeta } : {}),
      },
    };

    try {
      const { data } = await createMeeting({ variables: { input } });
      const id = data?.createMeeting.id;
      if (id) onCreated?.(id);
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create the meeting.");
    }
  };

  return (
    <TWModal
      isOpen={isOpen}
      onClose={closeAndReset}
      size="xl"
      header={
        <Text color={aiqlickTokens.gray900} fontSize={16} fontWeight="600">
          New meeting
        </Text>
      }
      footer={
        <>
          <TWButton
            label="Cancel"
            variant="ghost"
            color="default"
            size="md"
            onPress={closeAndReset}
          />
          <TWButton
            label="Schedule"
            variant="primary"
            color="primary"
            size="md"
            isLoading={loading}
            onPress={handleSubmit}
          />
        </>
      }
    >
      {/* ── Title (large, borderless, focus shows underline) ──── */}
      <Row icon={<Pencil size={16} color={aiqlickTokens.gray500} />}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={handleSubmit}
          onFocus={() => setTitleFocused(true)}
          onBlur={() => setTitleFocused(false)}
          autoFocus
          returnKeyType="done"
          placeholder="Add a title"
          placeholderTextColor={aiqlickTokens.gray400}
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: aiqlickTokens.gray900,
            paddingVertical: 4,
            borderBottomWidth: 2,
            borderBottomColor: titleFocused
              ? aiqlickTokens.primary
              : "transparent",
            outlineStyle: "none" as unknown as undefined,
          }}
        />
      </Row>

      {/* ── Attendees ───────────────────────────────────────────── */}
      <Row
        icon={<Users size={16} color={aiqlickTokens.gray500} />}
        alignTop={attendees.length > 0}
      >
        <YStack gap={attendees.length > 0 ? 10 : 0}>
          <XStack alignItems="center" gap={8}>
            <TextInput
              value={attendeeEmail}
              onChangeText={setAttendeeEmail}
              onSubmitEditing={handleAddAttendee}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
              placeholder="Add required attendees"
              placeholderTextColor={aiqlickTokens.gray400}
              style={{
                flex: 1,
                fontSize: 14,
                color: aiqlickTokens.gray900,
                paddingVertical: 4,
                borderBottomWidth: 1,
                borderBottomColor: emailFocused
                  ? aiqlickTokens.primary
                  : "transparent",
                outlineStyle: "none" as unknown as undefined,
              }}
            />
            <InlinePopover
              value={attendeeRole}
              options={ATTENDEE_ROLES}
              onChange={(v) => setAttendeeRole(v as AttendeeRole)}
              minWidth={140}
            />
            <Pressable
              onPress={handleAddAttendee}
              disabled={!attendeeEmail.trim()}
              style={({ pressed, hovered }) => ({
                width: 30,
                height: 30,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: !attendeeEmail.trim()
                  ? aiqlickTokens.gray100
                  : pressed
                    ? aiqlickTokens.primaryActive
                    : hovered
                      ? "#4B61A8"
                      : aiqlickTokens.primary,
              })}
            >
              <Plus
                size={14}
                color={!attendeeEmail.trim() ? aiqlickTokens.gray400 : "#fff"}
              />
            </Pressable>
          </XStack>
          {attendeeError && (
            <Text color={aiqlickTokens.danger} fontSize={11}>
              {attendeeError}
            </Text>
          )}
          {attendees.length > 0 && (
            <YStack gap={4}>
              {attendees.map((a) => (
                <XStack
                  key={a.email}
                  alignItems="center"
                  gap={10}
                  paddingVertical={6}
                >
                  <View
                    width={24}
                    height={24}
                    borderRadius={9999}
                    backgroundColor={aiqlickTokens.primary}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text color="#fff" fontSize={10} fontWeight="700">
                      {initials(a.email)}
                    </Text>
                  </View>
                  <Text
                    flex={1}
                    color={aiqlickTokens.gray900}
                    fontSize={13}
                    fontWeight="500"
                    numberOfLines={1}
                  >
                    {a.email}
                  </Text>
                  <InlinePopover
                    value={a.role ?? "PARTICIPANT"}
                    options={ATTENDEE_ROLES}
                    onChange={(v) =>
                      setAttendees((prev) =>
                        prev.map((x) =>
                          x.email === a.email
                            ? { ...x, role: v as AttendeeRole }
                            : x,
                        ),
                      )
                    }
                    minWidth={130}
                  />
                  <Pressable
                    onPress={() =>
                      setAttendees((prev) =>
                        prev.filter((x) => x.email !== a.email),
                      )
                    }
                    hitSlop={6}
                    style={({ pressed, hovered }) => ({
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor:
                        pressed || hovered
                          ? aiqlickTokens.gray100
                          : "transparent",
                    })}
                  >
                    <X size={12} color={aiqlickTokens.gray500} />
                  </Pressable>
                </XStack>
              ))}
            </YStack>
          )}
        </YStack>
      </Row>

      {/* ── Date + time (single inline row) ─────────────────────── */}
      <Row icon={<CalendarIcon size={16} color={aiqlickTokens.gray500} />}>
        <XStack alignItems="center" gap={10} flexWrap="wrap">
          <InlineDate value={date} onChange={setDate} min={today()} />
          <Text color={aiqlickTokens.gray300} fontSize={14}>
            ·
          </Text>
          <InlinePopover
            value={time}
            options={
              date === today()
                ? TIME_OPTIONS.filter(
                    (t) => hhmmToMinutes(t.value) >= hhmmToMinutes(nextQuarterHour()),
                  )
                : TIME_OPTIONS
            }
            onChange={(next) => {
              const prevDur = durationBetween(time, endTime);
              setTime(next);
              if (Number.isFinite(prevDur) && prevDur > 0) {
                setEndTime(minutesToHhmm(hhmmToMinutes(next) + prevDur));
              }
            }}
            minWidth={140}
          />
          <ArrowRight size={12} color={aiqlickTokens.gray400} />
          <InlinePopover
            value={endTime}
            options={TIME_OPTIONS}
            onChange={setEndTime}
            minWidth={140}
          />
          <View
            paddingHorizontal={8}
            paddingVertical={3}
            borderRadius={9999}
            backgroundColor={aiqlickTokens.primaryFaint}
          >
            <Text
              color={aiqlickTokens.primary}
              fontSize={11}
              fontWeight="700"
            >
              {Number.isFinite(durationBetween(time, endTime))
                ? formatDuration(durationBetween(time, endTime))
                : "—"}
            </Text>
          </View>
        </XStack>
      </Row>

      {/* ── Time zone ───────────────────────────────────────────── */}
      <Row icon={<Globe size={16} color={aiqlickTokens.gray500} />}>
        <InlinePopover
          value={timezone}
          options={TIMEZONES}
          onChange={setTimezone}
          minWidth={240}
        />
      </Row>

      {/* ── Recurrence (inline; expands when clicked) ───────────── */}
      <Row
        icon={<RotateCw size={16} color={aiqlickTokens.gray500} />}
        alignTop={showRecurrence || recurrence !== "NONE"}
      >
        {!showRecurrence && recurrence === "NONE" ? (
          <Pressable
            onPress={() => setShowRecurrence(true)}
            style={({ pressed, hovered }) => ({
              alignSelf: "flex-start",
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
              backgroundColor:
                pressed || hovered
                  ? aiqlickTokens.gray100
                  : "transparent",
            })}
          >
            <Text color={aiqlickTokens.gray700} fontSize={14}>
              Doesn&apos;t repeat
            </Text>
          </Pressable>
        ) : (
          <RecurrenceFields
            recurrence={recurrence}
            setRecurrence={setRecurrence}
            weekdays={weekdays}
            setWeekdays={setWeekdays}
            endType={endType}
            setEndType={setEndType}
            occurrences={occurrences}
            setOccurrences={setOccurrences}
            endDate={endDate}
            setEndDate={setEndDate}
            onCancel={() => {
              setShowRecurrence(false);
              setRecurrence("NONE");
              setWeekdays([]);
            }}
          />
        )}
      </Row>

      {/* ── Type pills ──────────────────────────────────────────── */}
      <Row icon={<Tag size={16} color={aiqlickTokens.gray500} />}>
        <XStack gap={6} flexWrap="wrap">
          {MEETING_TYPES.map((opt) => {
            const active = opt.value === type;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setType(opt.value)}
                style={({ pressed, hovered }) => ({
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 9999,
                  backgroundColor: active
                    ? aiqlickTokens.primary
                    : pressed || hovered
                      ? aiqlickTokens.gray100
                      : "transparent",
                  borderWidth: active ? 0 : 1,
                  borderColor: aiqlickTokens.gray200,
                })}
              >
                <Text
                  color={active ? "#fff" : aiqlickTokens.gray700}
                  fontSize={11}
                  fontWeight="600"
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </XStack>
      </Row>

      {/* ── Description ─────────────────────────────────────────── */}
      <Row
        icon={<AlignLeft size={16} color={aiqlickTokens.gray500} />}
        alignTop
        isLast
      >
        <TextInput
          value={description}
          onChangeText={setDescription}
          onFocus={() => setDescriptionFocused(true)}
          onBlur={() => setDescriptionFocused(false)}
          placeholder="Type details for this new meeting"
          placeholderTextColor={aiqlickTokens.gray400}
          multiline
          numberOfLines={3}
          style={{
            fontSize: 13,
            color: aiqlickTokens.gray700,
            minHeight: 56,
            paddingVertical: 4,
            borderBottomWidth: 1,
            borderBottomColor: descriptionFocused
              ? aiqlickTokens.primary
              : "transparent",
            outlineStyle: "none" as unknown as undefined,
            textAlignVertical: "top",
          }}
        />
      </Row>

      {error && (
        <View
          padding={10}
          borderRadius={aiqlickTokens.radiusLg}
          backgroundColor={aiqlickTokens.dangerLight}
          borderWidth={1}
          borderColor="rgba(220, 38, 38, 0.3)"
        >
          <Text color={aiqlickTokens.danger} fontSize={12}>
            {error}
          </Text>
        </View>
      )}
    </TWModal>
  );
}

/**
 * Single icon-prefixed row, the foundational layout primitive for the
 * Teams-style modal body. Light divider beneath each one. `alignTop`
 * floats the icon to the row's top edge — useful when the right-side
 * content grows past a single line (attendees list, description,
 * expanded recurrence).
 */
function Row({
  icon,
  children,
  alignTop,
  isLast,
}: {
  icon: ReactNode;
  children: ReactNode;
  alignTop?: boolean;
  isLast?: boolean;
}) {
  return (
    <XStack
      alignItems={alignTop ? "flex-start" : "center"}
      gap={14}
      paddingVertical={12}
      minHeight={44}
      borderBottomWidth={isLast ? 0 : 1}
      borderBottomColor={aiqlickTokens.gray100}
    >
      <View
        width={20}
        alignItems="center"
        justifyContent="center"
        paddingTop={alignTop ? 4 : 0}
      >
        {icon}
      </View>
      <View flex={1}>{children}</View>
    </XStack>
  );
}

/**
 * Borderless inline date "text-button".
 *
 * On web we render the friendly `Mon, May 20` text as a Pressable
 * and keep a tiny hidden `<input type="date">` alongside it. Tapping
 * the Pressable calls the input's `showPicker()` (newer browsers) or
 * falls back to `.click()` — opening the browser's native calendar
 * UI even when the user clicks the *text*, which wouldn't otherwise
 * trigger the picker (Chrome only opens it on the calendar icon).
 *
 * On native we just render the label for now — the dedicated RN
 * datetimepicker integration will plug in here.
 */
function InlineDate({
  value,
  onChange,
  min,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: string;
}) {
  // We type this as HTMLInputElement because we only use the ref on
  // the web code-path where the element is, in fact, a raw <input>.
  const inputRef = useRef<HTMLInputElement | null>(null);
  const label = value ? formatDateLabel(value) : "Pick a date";

  if (Platform.OS === "web") {
    const openPicker = () => {
      const node = inputRef.current;
      if (!node) return;
      try {
        const withShowPicker = node as HTMLInputElement & {
          showPicker?: () => void;
        };
        if (typeof withShowPicker.showPicker === "function") {
          withShowPicker.showPicker();
        } else {
          node.click();
        }
      } catch {
        node.click?.();
      }
    };
    return (
      <Pressable
        onPress={openPicker}
        style={({ pressed, hovered }) => ({
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 6,
          backgroundColor:
            pressed || hovered ? aiqlickTokens.gray50 : "transparent",
          position: "relative",
        })}
      >
        <Text color={aiqlickTokens.gray900} fontSize={14} fontWeight="500">
          {label}
        </Text>
        {/* Raw <input type="date"> — JSX intrinsic, renders as a real
            HTMLInputElement on react-native-web. We keep it offscreen
            (1×1 px, opacity 0) and trigger its `showPicker()` from
            the wrapping Pressable so clicking the *text* opens the
            calendar (browsers normally only open it on the icon area). */}
        {/* @ts-expect-error react-native-web tolerates raw DOM elements */}
        <input
          ref={inputRef}
          type="date"
          min={min}
          value={value ?? ""}
          onChange={(e: { target: { value: string } }) =>
            onChange(e.target.value)
          }
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1,
            height: 1,
            opacity: 0,
            border: "none",
            padding: 0,
            pointerEvents: "none",
          }}
        />
      </Pressable>
    );
  }
  return (
    <Text color={aiqlickTokens.gray900} fontSize={14} fontWeight="500">
      {label}
    </Text>
  );
}

/**
 * Minimal popover-select. Renders the active option as plain text +
 * chevron; clicking it surfaces a vertically-scrolling option list
 * below. Click outside / re-click / option-select dismisses. Used for
 * start/end times, timezone, attendee role.
 */
function InlinePopover<V extends string>({
  value,
  options,
  onChange,
  minWidth = 160,
}: {
  value: V;
  options: { value: V; label: string }[];
  onChange: (v: V) => void;
  minWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const label = options.find((o) => o.value === value)?.label ?? value;

  return (
    <YStack position="relative" zIndex={open ? 100 : 1}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed, hovered }) => ({
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 6,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: open
            ? aiqlickTokens.gray100
            : pressed || hovered
              ? aiqlickTokens.gray50
              : "transparent",
        })}
      >
        <Text
          color={aiqlickTokens.gray900}
          fontSize={14}
          fontWeight="500"
          numberOfLines={1}
        >
          {label}
        </Text>
        <ChevronDown size={12} color={aiqlickTokens.gray500} />
      </Pressable>
      {open && (
        <>
          {/* Backdrop catches outside-clicks and dismisses the popover.
              Sits behind the option list (lower zIndex) but in front of
              the rest of the modal body. */}
          <Pressable
            onPress={() => setOpen(false)}
            style={{
              position: "absolute" as const,
              top: -2000,
              left: -2000,
              right: -2000,
              bottom: -2000,
              zIndex: 50,
            }}
          />
          <YStack
            position="absolute"
            top={32}
            left={0}
            minWidth={minWidth}
            maxHeight={240}
            borderRadius={aiqlickTokens.radiusLg}
            backgroundColor={aiqlickTokens.surface}
            borderWidth={1}
            borderColor={aiqlickTokens.gray200}
            shadowColor="#1A2556"
            shadowOpacity={0.2}
            shadowRadius={24}
            shadowOffset={{ width: 0, height: 12 }}
            overflow="hidden"
            zIndex={100}
          >
            <ScrollView style={{ maxHeight: 240 }}>
              {options.map((opt) => {
                const isSel = opt.value === value;
                return (
                  <Pressable
                    key={String(opt.value)}
                    onPress={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    style={({ pressed, hovered }) => ({
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: isSel
                        ? aiqlickTokens.primaryFaint
                        : pressed || hovered
                          ? aiqlickTokens.gray50
                          : "transparent",
                    })}
                  >
                    <Text
                      color={isSel ? aiqlickTokens.primary : aiqlickTokens.gray900}
                      fontSize={13}
                      fontWeight={isSel ? "600" : "500"}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </YStack>
        </>
      )}
    </YStack>
  );
}

/** Expanded recurrence editing (frequency + weekday picker + ends). */
function RecurrenceFields({
  recurrence,
  setRecurrence,
  weekdays,
  setWeekdays,
  endType,
  setEndType,
  occurrences,
  setOccurrences,
  endDate,
  setEndDate,
  onCancel,
}: {
  recurrence: RecurrenceType;
  setRecurrence: (v: RecurrenceType) => void;
  weekdays: number[];
  setWeekdays: (fn: (prev: number[]) => number[]) => void;
  endType: "OCCURRENCES" | "UNTIL";
  setEndType: (v: "OCCURRENCES" | "UNTIL") => void;
  occurrences: string;
  setOccurrences: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  onCancel: () => void;
}) {
  return (
    <YStack gap={10}>
      <XStack alignItems="center" gap={10}>
        <InlinePopover
          value={recurrence}
          options={RECURRENCE_TYPES}
          onChange={(v) => setRecurrence(v as RecurrenceType)}
          minWidth={180}
        />
        <View flex={1} />
        <Pressable
          onPress={onCancel}
          hitSlop={6}
          style={({ pressed, hovered }) => ({
            width: 22,
            height: 22,
            borderRadius: 6,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
              pressed || hovered ? aiqlickTokens.gray100 : "transparent",
          })}
        >
          <X size={11} color={aiqlickTokens.gray500} />
        </Pressable>
      </XStack>
      {(recurrence === "WEEKLY" || recurrence === "BIWEEKLY") && (
        <XStack gap={6} alignItems="center">
          <Text color={aiqlickTokens.gray500} fontSize={11} marginRight={4}>
            On
          </Text>
          {["S", "M", "T", "W", "T", "F", "S"].map((label, idx) => {
            const active = weekdays.includes(idx);
            return (
              <Pressable
                key={idx}
                onPress={() =>
                  setWeekdays((prev) =>
                    active
                      ? prev.filter((d) => d !== idx)
                      : [...prev, idx].sort((a, b) => a - b),
                  )
                }
                style={({ pressed, hovered }) => ({
                  width: 26,
                  height: 26,
                  borderRadius: 9999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: active
                    ? aiqlickTokens.primary
                    : pressed || hovered
                      ? aiqlickTokens.gray100
                      : "transparent",
                  borderWidth: active ? 0 : 1,
                  borderColor: aiqlickTokens.gray200,
                })}
              >
                <Text
                  color={active ? "#fff" : aiqlickTokens.gray700}
                  fontSize={10}
                  fontWeight="700"
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </XStack>
      )}
      {recurrence !== "NONE" && (
        <XStack gap={8} alignItems="center" flexWrap="wrap">
          <Text color={aiqlickTokens.gray500} fontSize={11}>
            Ends
          </Text>
          <InlinePopover
            value={endType}
            options={[
              { value: "OCCURRENCES", label: "after" },
              { value: "UNTIL", label: "on" },
            ]}
            onChange={(v) => setEndType(v as "OCCURRENCES" | "UNTIL")}
            minWidth={100}
          />
          {endType === "OCCURRENCES" ? (
            <XStack alignItems="center" gap={4}>
              <TextInput
                value={occurrences}
                onChangeText={(v) => setOccurrences(v.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                style={{
                  fontSize: 14,
                  color: aiqlickTokens.gray900,
                  fontWeight: "500",
                  width: 40,
                  textAlign: "center",
                  paddingVertical: 2,
                  borderBottomWidth: 1,
                  borderBottomColor: aiqlickTokens.gray200,
                  outlineStyle: "none" as unknown as undefined,
                }}
              />
              <Text color={aiqlickTokens.gray700} fontSize={13}>
                occurrence{Number(occurrences) === 1 ? "" : "s"}
              </Text>
            </XStack>
          ) : (
            <InlineDate value={endDate} onChange={setEndDate} />
          )}
        </XStack>
      )}
    </YStack>
  );
}

function initials(emailOrName: string): string {
  const local = emailOrName.split("@")[0] ?? emailOrName;
  const parts = local.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatDateLabel(iso: string): string {
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Next 15-minute slot from now, e.g. 13:07 → "13:15", 13:46 → "14:00".
 * Used as the default start time when the modal opens so a freshly-
 * opened form is never pre-filled with a past time.
 */
function nextQuarterHour(): string {
  const d = new Date();
  const mins = d.getHours() * 60 + d.getMinutes();
  const next = Math.ceil((mins + 1) / 15) * 15;
  const wrapped = next % (24 * 60);
  return minutesToHhmm(wrapped);
}
