# AiQlick Meeting - Gemini CLI Instructions

Expo / React Native / Tamagui application for video conferencing via Jitsi.

## Daily Commands
- `npm start` - Start Expo dev server
- `npm run ios` / `npm run android` / `npm run web` - Start platform dev
- `npm run lint` - Run ESLint

## Critical Rules
- **Integration:** Embeds Jitsi conference via IFrame API (Web) and Native Jitsi SDK (Mobile).
- **Styling:** Uses Tamagui for cross-platform components.

## Architectural Patterns
- **API:** Integrates with Apollo Client for meeting-related GraphQL queries.
- **Navigation:** Uses `expo-router` for file-based routing.

For full details, see the root [GEMINI.md](../GEMINI.md) and [docs.aiqlick.com](https://docs.aiqlick.com).
