# aiqlick-meeting — production readiness checklist

This app is an Expo + React Native + Tamagui codebase that already
runs in the browser via `expo start --web`. To ship it as a polished
**iOS** and **Android** app from the same codebase, the following
items have to land. Ordered by gating dependency.

The web target is deployed from `main` through
`.github/workflows/ecr-deploy.yml`: GitHub Actions builds the Expo
static export into an nginx Docker image, pushes it to ECR, then
restarts the EC2 `web` container through SSM. The active production
client embeds the Jitsi backend at `book.aiqlick.com`.

The lightweight CI path is `.github/workflows/ci.yml`, which runs on
pull requests and pushes to `main` / `dev`. It installs with `npm ci`,
runs Expo ESLint, and builds the web export. The old upstream Jitsi
Lua / native SDK package workflows do not apply to this Expo app.

The list is honest: items 1-3 unblock day-to-day mobile dev, 4-6 are
polish, 7-10 are production hardening.

---

## 1. EAS Build account + `eas.json` config — **gating**

`expo run:ios` / `run:android` only produce local builds. Real signed
`.ipa` / `.aab` artifacts come from **EAS Build**.

- Sign in: `npx eas login`
- Initialize: `npx eas init`
- Create profiles in `eas.json`:
  - `development` — internal dev client with debug symbols
  - `preview` — staging / TestFlight / Google internal track
  - `production` — App Store / Play Store release
- Set per-profile env in `eas.json.extra.{apiUrl, jitsiDomain}` so we
  can hit `api.aiqlick.com` from production builds and a local backend
  from dev.

## 2. Custom dev client — **gating for mobile**

Expo Go can't load `@jitsi/react-native-sdk` (native module). Without
a dev client, the mobile app crashes on startup.

```bash
# Build it once per platform, install on test devices.
eas build --profile development --platform ios
eas build --profile development --platform android
```

After install, run `npx expo start --dev-client` for daily work.

## 3. Wire the native Jitsi SDK — **gating for mobile meetings**

[hooks/jitsi-embed.ts](../hooks/jitsi-embed.ts) is currently a stub
that returns a "Mobile meeting client coming soon" message. The
native sibling needs to:

- Import `JitsiMeeting` from `@jitsi/react-native-sdk`.
- Map our `JitsiCommandName` → `JitsiRefProps.dispatchCommand()`.
- Forward the same lifecycle events
  (`onConferenceJoined` / `onConferenceWillLeave` /
  `onAudioMutedChanged` / `onVideoMutedChanged`) into the shared
  `onStateChange` callback so the wrapper UI doesn't branch on
  platform.

The contract surface lives in [hooks/jitsi-types.ts](../hooks/jitsi-types.ts);
once that's wired, every other surface (header, toolbar, participants
panel, insights panel, hangup-redirect logic) works on native
unchanged.

## 4. App icons + splash assets

`app.json` currently points at `./images/logo.svg`. Apple and Google
want raster:

- `assets/icon.png` — 1024×1024, no transparency, no rounded corners
  (the OS rounds it).
- `assets/splash.png` — 1242×2436 minimum, `resizeMode: "contain"`.
- `assets/adaptive-icon.png` — 1024×1024 foreground for Android
  adaptive icons, background colour in `app.json`.
- Favicon for web — `assets/favicon.png` 48×48.

Run them through Expo's prebuild so Xcode / Gradle pick them up:

```bash
npx expo prebuild --clean
```

## 5. Permissions copy

`app.json` already declares:

- iOS: `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`.
- Android: `CAMERA`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`,
  `BLUETOOTH`, `BLUETOOTH_CONNECT`.

Missing for production:

- iOS: `NSBluetoothAlwaysUsageDescription` if you want call audio
  routing to AirPods / wireless headsets.
- iOS: `NSLocalNetworkUsageDescription` if local Bonjour discovery
  ever lands (Apple now requires this even if you don't actively use
  Bonjour — its absence trips review on some recent SDKs).

## 6. Deep linking — universal / app links

`app.json` sets `"scheme": "aiqlick-meeting"`. That gives you
`aiqlick-meeting://<room>?jwt=…` deep links. For *real* email/SMS
"Join Meeting" buttons that resolve to the app when installed and
fall through to web otherwise, you also need:

- **iOS**: `ios.associatedDomains: ["applinks:meet.aiqlick.com"]` in
  `app.json`, plus `apple-app-site-association` JSON hosted at
  `https://meet.aiqlick.com/.well-known/apple-app-site-association`.
- **Android**: `android.intentFilters` with `autoVerify: true` and the
  matching host, plus `assetlinks.json` at
  `https://meet.aiqlick.com/.well-known/assetlinks.json`.

When this is set up, `https://meet.aiqlick.com/<room>?jwt=…` opens the
native app directly on devices that have it installed.

## 7. Push notifications

Required for: "Meeting starting in 5 min", "You missed a call",
chat-message-while-app-is-backgrounded.

- Add `expo-notifications` (already an Expo SDK 52 supported module).
- For Apple: APNS key under the EAS profile; for Android: Firebase
  service-account JSON.
- Backend integration: aiqlick-backend already has a `notification`
  module — wire a new "meeting reminder" event into Expo's push
  service or directly into APNS/FCM.
- Register the device token in `UserAuthProvider` after login and
  send it up with a new `registerPushToken` mutation.

## 8. OTA updates via EAS Update

Lets us ship JS-only fixes (typos, layout tweaks, copy changes)
without an app-store re-review cycle. Adds:

- `eas update:configure`
- `expo-updates` is already a transitive dep of `expo@52` — needs
  enabling in `app.json`'s `updates` block with the runtime version.
- A `release` step in CI that runs `eas update --branch production`
  on every main-branch merge.

## 9. Per-environment configuration

Currently `app.json` has a single `extra.apiUrl`. For three
environments (local, dev, prod) we need per-profile overrides via
`eas.json`:

```jsonc
{
  "build": {
    "development": {
      "extra": { "apiUrl": "http://localhost:3000", "jitsiDomain": "..." }
    },
    "preview": {
      "extra": { "apiUrl": "https://api-dev.aiqlick.com", "jitsiDomain": "book.aiqlick.com" }
    },
    "production": {
      "extra": { "apiUrl": "https://api.aiqlick.com", "jitsiDomain": "book.aiqlick.com" }
    }
  }
}
```

`Constants.expoConfig.extra` reads whichever profile produced the
build — no code changes needed.

## 10. Real-device QA pass

The web target works on desktop Chrome / Safari. Each new surface has
to be verified on real phones because:

- Tamagui's web rendering ≠ its native rendering (RN flexbox quirks,
  text wrapping, scroll-view bounce, safe-area handling).
- `expo-secure-store` falls back to localStorage on web but uses the
  Keychain on iOS — login persistence behaves differently.
- The native Jitsi SDK has its own UI layer underneath ours; conflicts
  often only surface on device.

Surfaces that need explicit native QA:

- Login screen — keyboard avoidance on iOS, autofill behaviour.
- Meetings dashboard — pull-to-refresh, swipe gestures, scroll.
- Calendar grid — tap targets at small screen sizes.
- Create Meeting modal — sheet animation, date picker (we still
  fall back to text input on native; consider plumbing in
  `@react-native-community/datetimepicker`).
- Meeting room — orientation lock to portrait on phones is debatable;
  landscape might be useful on tablets.

---

## What this app already has that doesn't need work

- Apollo Client + JWT storage cross-platform.
- Tamagui-driven design system that renders on web + iOS + Android.
- Auth flow, meetings list (List + Calendar views), create-meeting
  modal, meeting detail page, in-meeting toolbar, participants panel,
  insights panel — all written against the shared component API and
  the same backend GraphQL operations aiqlick-frontend uses, so
  records stay in sync across clients.
- Cross-platform meeting URL handling (fresh-JWT join via
  `getMyMeetingLink`).

---

## Rough effort estimate

| Item | Effort |
|---|---|
| 1. EAS Build + `eas.json` | 1-2 h ops |
| 2. Custom dev client | 1 h once per platform |
| 3. Native Jitsi SDK wiring | 4-6 h |
| 4. Icons + splash | 1-2 h design + plumbing |
| 5. Permissions copy | 15 min |
| 6. Universal / app links | 2-3 h plus a hosted `.well-known/` |
| 7. Push notifications | 1-2 days incl. backend wiring |
| 8. EAS Update + CI | 2-3 h |
| 9. Per-env `extra` | 30 min |
| 10. Native QA + fixes | 1-2 days iterative |

**To "TestFlight-able alpha":** items 1-5, about a day.
**To "App Store-ready production":** add 6-10, ~1 week.
