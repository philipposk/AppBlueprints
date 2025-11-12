## AppBlueprints Project Plan

### Vision
- **Name:** AppBlueprints
- **Core Goal:** Give creators a conversational (text or voice) assistant that converts an app idea into a fully scoped plan plus starter scaffolding using our standard Instructions, Cursor Rules, and TODO template.
- **Signature Experience:** Share an idea and supporting vibes (voice note, mood board). AppBlueprints replies with tailored questions, auto-fills the template, and flags any missing decisions to confirm with the user.

### Key Features
- **Groq-powered dialog:** Real-time chat flow using Groq LLM for ideation, template synthesis, and clarification prompts.
- **Voice capture:** Browser recording uploaded to Groq Whisper for transcription.
- **Mood board influence:** Image upload extracts a color palette and vibe summary that conditions follow-up questions.
- **Template autopopulation:** Keeps canonical Instructions / Cursor Rules / TODO documents in sync with every answer and prompts for gaps.
- **Clarification loop:** Surfaces unanswered template slots in the chat and in a dedicated checklist so users resolve them quickly.
- **Cursor integration staging:** Provide an actionable endpoint to push generated artifacts into a Cursor workspace (scaffold only; token-driven orchestration).

### Tech Stack
- **Framework:** Next.js (App Router) with TypeScript.
- **Styling:** Tailwind CSS plus Radix UI primitives where needed.
- **State management:** Zustand for conversational/session state.
- **Server actions & APIs:** Route handlers under `/app/api` for Groq chat, Groq Whisper transcription, mood board processing, and Cursor export.
- **Package manager:** pnpm.
- **Testing:** Playwright for E2E happy path (chat/voice/upload).
- **Commit style:** Conventional commits.

### Data Flow & Integrations
1. User submits idea (text or voice). Optional mood board upload and vibe meter adjustment.
2. Frontend sends current conversation, palette metadata, vibe score, and template snapshot to `/api/groq/plan`.
3. API route crafts a structured Groq prompt and expects JSON with:
   - `assistantMessage`
   - `template` object mirroring Instructions / Cursor Rules / TODO sections
   - `clarifications` array of pending questions
4. Frontend merges updates into Zustand store, renders template panes, and queues clarification questions in chat UI.
5. Voice recordings hit `/api/groq/transcribe`, which streams the blob to Groq Whisper and returns text for the chat pipeline.
6. Mood board uploads pass through a palette extractor (e.g., node-vibrant) to feed vibe hints back into prompts.
7. When the plan is ready, user can trigger `/api/cursor/export` with the filled template. The handler reads `CURSOR_API_TOKEN`/`CURSOR_WORKSPACE_ID` env vars and (initially) logs or stubs a request to Cursor’s API endpoint for later completion.

### Security & Privacy
- All API keys supplied via environment variables (`GROQ_API_KEY`, `CURSOR_API_TOKEN`, `CURSOR_WORKSPACE_ID`).
- Never persist secrets client-side; fetch routes run server-side only.
- Optional persistence layer left out for v1; conversation state stays client-side until export.
- Image uploads limited to reasonable size and stored only in-memory for palette extraction.

### Milestones
1. **Scaffold** Next.js project with Tailwind, Zustand, shared UI shell components.
2. **Groq chat MVP** with structured JSON response parsing and template synchronization.
3. **Voice & mood board enhancements** (audio recorder, transcription route, palette extraction).
4. **Cursor export stub** with configuration UI.
5. **Testing & polish** (Playwright scenario, responsive layout, instructions in README).

