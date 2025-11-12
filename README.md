## AppBlueprints · Development Blueprint Generator

AppBlueprints is a Next.js application that transforms app ideas into structured development blueprints with AI-powered Instructions, Cursor Rules, and actionable TODO lists. It supports Groq-powered chat, voice transcription, mood-board palette extraction, and Cursor export stubs so you can bootstrap new projects directly from a vibe session.

### Key Features

- Groq chat orchestration for filling the Instructions / Cursor Rules / TODO template.
- Voice capture with Whisper transcription (or stubbed responses for local development).
- Mood board uploader with automatic palette summaries feeding vibe-aware prompts.
- Vibe meter slider to steer assistant tone.
- Clarification queue that shows every unanswered template item with example + recommendation.
- Cursor export scaffolding that prepares Markdown payloads for future API hooks.

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and set:

```bash
cp .env.example .env.local
```

| Variable | Description |
| --- | --- |
| `GROQ_API_KEY` | Required for live chat + transcription. Leave blank and set `APPBLUEPRINTS_USE_GROQ_STUB=true` for offline development. |
| `CURSOR_API_TOKEN`, `CURSOR_WORKSPACE_ID` | Optional; when provided the export route logs payloads ready for Cursor's future API. |
| `CURSOR_API_BASE_URL` | Override Cursor endpoint if needed (defaults to `https://api.cursor.run`). |
| `APPBLUEPRINTS_USE_GROQ_STUB` | Set to `true` to bypass Groq calls and use local stub responses (used by Playwright tests). |

### 3. Run the dev server

```bash
pnpm dev
```

Visit `http://localhost:3000` to start vibecoding.

## Testing

Playwright drives the happy-path UI test with Groq stub mode enabled automatically via the config.

```bash
pnpm test:e2e
```

Traces are captured on the first retry; reports are stored in `playwright-report/`.

## Project Structure

- `src/state/` — Zustand store for conversation state, template values, palette data.
- `src/lib/` — Shared template definitions, schema validators, and helper utilities.
- `src/components/` — Chat UI, template decks, vibe controls, mood board upload, Cursor export panel.
- `src/app/api/groq` — Plan + transcription routes using Groq SDK (with stub fallback).
- `src/app/api/cursor` — Export scaffolding that logs payloads and can be wired to Cursor APIs.
- `tests/` — Playwright specs.

## Development Notes

- Conventional commits recommended (e.g., `feat: add Groq stub mode`).
- Run `pnpm lint` before submitting changes.
- Set `APPBLUEPRINTS_USE_GROQ_STUB=true` when developing without credentials; remember to revert for production.
