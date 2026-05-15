# aiqlick-meeting

Aiqlick's meeting client. **One codebase, three targets** — runs on
the web, iOS, and Android from the same source. Built on Expo +
React Native + React Native for Web + Tamagui.

## Architecture

```
Browser tab / iOS app / Android app
└── React Native UI (this repo — same code, three platforms)
    └── Jitsi embed (platform-split)
        ├── web:        <iframe> via Jitsi IFrame API
        └── native:     @jitsi/react-native-sdk (native WebRTC)
            ↓ XMPP + WebRTC
        Prosody / Jicofo / JVB   (managed by jitsi-deploy)
```

The Jitsi backend (Prosody, Jicofo, JVB) lives in
[`jitsi-deploy`](https://github.com/AiQlickProject/jitsi-deploy). This
repo owns only the client UI on every platform.

## Stack

- **Expo SDK 52** — handles iOS / Android / Web builds + signing + OTA
- **React Native 0.76** + React 18.3
- **React Native for Web 0.19** — runs the same components on browsers
- **Tamagui 1.119** — cross-platform styling, design tokens shared with `aiqlick-frontend`
- **Expo Router 4** — file-based routing across all three targets
- **Jitsi IFrame API** (web) + **@jitsi/react-native-sdk** (mobile)

## Local development

```bash
npm install
npm run web        # opens http://localhost:8081
npm run ios        # opens iOS simulator (requires Xcode)
npm run android    # opens Android emulator (requires Android Studio)
npm run start      # opens Expo dev menu, lets you pick a target
```

Both `web` and `ios`/`android` can run simultaneously — Expo's hot
reload pushes changes to every connected device on save.

## Build

```bash
npm run build:web       # production web bundle → dist/
npm run lint            # Expo ESLint checks
npm run typecheck       # optional TS check; currently tracks Tamagui typing debt
```

GitHub CI runs `npm ci`, `npm run lint`, and `npm run build:web` on
pull requests and on pushes to `main` / `dev`. The web export is the
same build path used by the production Docker image.

### Mobile builds

Production mobile binaries are built by **EAS Build** (Expo
Application Services). Set up once:

```bash
npm install -g eas-cli
eas login
eas build:configure
```

Then for each release:

```bash
eas build --platform ios       # TestFlight / App Store
eas build --platform android   # Internal track / Play Store
```

## Deploy

`.github/workflows/ecr-deploy.yml` builds the **web** Docker image
(Metro `expo export --platform web` → nginx serve), pushes to AWS
ECR, and SSMs into the EC2 to restart the `web` container. Triggers
on push to `main`.

`main` is the production deployment branch for the web client served
through the existing meeting infrastructure. To publish the current
dev app to `book.aiqlick.com`, move or merge `main` to the wanted
`dev` revision, then push `main`; the ECR workflow handles the build
and EC2 restart.

The app's Jitsi target remains `book.aiqlick.com` in `app.json` /
`eas.json`, so the deployed client embeds the same Jitsi backend while
replacing the web UI from `main`.

**Mobile deployment is separate** — EAS Submit pushes to the App
Store / Play Store.

## Recovery

Previous versions live on archive branches:
- `jitsi-fork-archive` — the original Jitsi-Meet fork
- `dev` — active Expo + React Native + Tamagui app branch
- The intermediate Vite + plain React shell was on `dev` at
  `c3bd6d675` (cherry-pick if needed)

## Files

```
app/                       Expo Router routes
├── _layout.tsx            TamaguiProvider + Stack + theme
├── index.tsx              Landing fallback ("no room specified")
└── [room].tsx             The meeting page

components/
├── MeetingHeader.tsx      Title, timer, participant count
├── MeetingToolbar.tsx     Bottom pill with all actions
├── ToolbarButton.tsx      Single rounded button
├── JitsiEmbed.tsx         Native: placeholder for native SDK
└── JitsiEmbed.web.tsx     Web: <div> the iframe mounts into

hooks/
├── useJitsi.ts            Public hook — same shape on all platforms
├── jitsi-embed.ts         Native impl (placeholder)
├── jitsi-embed.web.ts     Web impl using JitsiMeetExternalAPI
└── jitsi-types.ts         Shared contract

lib/
└── parse-url.ts           humanize room slug + decode JWT subject

tamagui.config.ts          Design tokens mirroring aiqlick-frontend
```
