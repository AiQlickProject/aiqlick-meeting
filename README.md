# aiqlick-meeting

React shell that embeds the AIQLick Jitsi conferencing room via the
[Jitsi IFrame API](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe).
All visible chrome (header, toolbar, side panels) is rendered by React;
the iframe in the middle handles real-time media against the existing
Jitsi backend at `book.aiqlick.com`.

## Architecture

```
Browser tab
├── React shell (this app)            ← header, toolbar, side panels
│   └── Jitsi IFrame API container
│       └── <iframe src="https://book.aiqlick.com/<room>?jwt=…">
│           └── Jitsi web frontend     ← managed by jitsi-deploy
│               ↓ XMPP / WebRTC
│           Prosody / Jicofo / JVB     ← managed by jitsi-deploy
```

This repo owns the React layer. The Jitsi backend, Prosody, JVB, and
the EC2 instance that runs them live in
[`jitsi-deploy`](https://github.com/AiQlickProject/jitsi-deploy).

## Stack

- React 19 + TypeScript
- Vite 6 (dev server + build)
- Tailwind CSS (theme tokens match `aiqlick-frontend`)
- Jitsi IFrame API (loaded at runtime from `book.aiqlick.com/external_api.js`)
- lucide-react for icons

## Local development

```bash
npm install
npm run dev
```

Opens at `http://localhost:8080`. Join a room with a room slug in the URL:

```
http://localhost:8080/aiqlick-test
```

If you need the meeting to start (production Prosody requires a JWT
for moderator), append `?jwt=<token>` — grab one from `aiqlick-frontend`
by clicking **Join** on a meeting and copying the URL from the new tab.

## Build

```bash
npm run build       # type-check + Vite production build → dist/
npm run preview     # serve dist/ locally on :8080
```

## Deploy

`.github/workflows/ecr-deploy.yml` builds the Docker image (Vite
build → nginx serve), pushes to AWS ECR, and SSMs into the EC2 to
restart the `web` container. Triggers on push to `main`.

## Recovery

The previous Jitsi-fork codebase is preserved on the
[`jitsi-fork-archive`](https://github.com/AiQlickProject/aiqlick-meeting/tree/jitsi-fork-archive)
branch. To roll back, redeploy that branch — the Dockerfile and CI
pipeline there still work against the same EC2 / ECR setup.

## Files

```
src/
├── App.tsx                  Root component
├── main.tsx                 Vite entry
├── index.css                Tailwind directives
├── pages/MeetingPage.tsx    Whole meeting view
├── components/
│   ├── MeetingHeader.tsx    Top bar — title, timer, participant count
│   ├── MeetingToolbar.tsx   Bottom toolbar pill
│   ├── ToolbarButton.tsx    Single rounded button used by the toolbar
│   └── JitsiEmbed.tsx       Container for the Jitsi iframe
├── hooks/
│   └── useJitsiApi.ts       Loads external_api.js, instantiates Jitsi,
│                            wires event listeners → React state
└── lib/
    ├── jitsi-iframe.ts      Lazy loader for external_api.js
    └── parse-url.ts         Parses room name + JWT from window.location
```
