# Add a `kilo` session provider (mirrors `opencode`)

## Context
`code-insights` ingests AI-coding-tool sessions via per-tool **providers** in
`cli/src/providers/`. Each provider implements `SessionProvider` (`discover` +
`parse`) and is registered in `cli/src/providers/registry.ts`. There is already
an `opencode` provider that reads from `~/.local/share/opencode`.

Kilo is a fork of OpenCode, and its on-disk session format is **structurally
identical** to OpenCode: same `~/.local/share/kilo/kilo.db` SQLite schema
(`session` / `message` / `part` tables) plus `storage/...` JSON files. The data
confirmed on this machine (`~/.local/share/kilo/kilo.db`, 51 sessions, 2169
messages, 7853 parts) uses the same JSON part shapes as OpenCode. So the new
`kilo` provider is a faithful port of `opencode.ts` with format-specific tweaks.

## Format deltas vs OpenCode (must handle in the parser)
These were confirmed directly against `~/.local/share/kilo/kilo.db`:
- **DB path**: `kilo.db` in `~/.local/share/kilo` (not `opencode.db`).
- **Timestamps are milliseconds** (e.g. `time_created = 1784386623277`). The
  `parseDatabaseSession` path currently does `new Date(msgRow.time_created)` —
  that is correct for OpenCode (seconds) and **wrong** for Kilo. Kilo must
  convert ms→ms via `new Date(value)`.
- **`session` table columns differ**: Kilo has `project_id` (FK → `project`),
  `model` (JSON `{"id":"...","providerID":"..."}`), `cost`, `tokens_input`,
  `tokens_output`, `tokens_cache_read`, `tokens_cache_write`, `agent`, `slug`,
  `version`, `title`, `directory`. It does **not** store per-message token
  columns. So session-level usage should be read from the `session` row
  (`cost`, `tokens_input/output/cache_read/cache_write`) when available, plus
  the per-message `step-finish` parts.
- **`message.data` JSON**: has `role`, `time.{created}`, `model.{providerID,
  modelID}`, `agent`, `summary`. No top-level `modelID`/`tokens` columns.
- **`part.data.type` values**: `text`, `reasoning` (OpenCode used `thinking`),
  `tool`, `step-start`, `step-finish`.
  - `reasoning` part → map to `thinking` (same as OpenCode's `thinking`).
  - `tool` part → `callID`, `tool`, `state.{input,output}` (identical).
  - `step-finish` part → `tokens.{input,output,reasoning,cache.{write,read},
    total}`, `cost` (same shape as OpenCode; note the extra `reasoning` field).
- **`sourceTool`** must be `'kilo'`.

## Implementation steps

1. **`cli/src/utils/config.ts`**
   - Add `getKiloDir(): string` returning
     `path.join(os.homedir(), '.local', 'share', 'kilo')` (mirror
     `getOpenCodeDir`, line 120). No Windows-specific branch needed (match the
     existing simple form).

2. **`cli/src/providers/kilo.ts`** (new file — port of `opencode.ts`)
   - Class `KiloProvider implements SessionProvider`, `getProviderName()` →
     `'kilo'`.
   - Reuse the same `discover` / `parse` / `parseDatabaseSession` /
     `parseJsonSession` / `parseBundledSession` / `calculateSessionUsage`
     structure. Swap `getOpenCodeDir()` → `getKiloDir()` and `kilo.db`.
   - Adjust timestamp parsing to **milliseconds**: `new Date(value)` where
     `value` is already ms. Verify each `new Date(...)` site in the ported code
     uses the raw ms value (no `*1000`).
   - In `parseDatabaseSession`: prefer session-row usage
     (`sessionRow.cost`, `tokens_input/output/cache_read/cache_write`,
     `sessionRow.model`) when present; still merge per-message `step-finish`
     tokens as OpenCode does.
   - Map `reasoning` part type → `thinking`.
   - Resolve model id from `message.data.model.modelID` /
     `sessionRow.model` JSON; set `session.claudeVersion =
     sessionRow.version`, `projectPath = sessionRow.directory`,
     `projectName = sessionRow.title || sessionRow.slug`.
   - Set `sourceTool: 'kilo'`.

3. **`cli/src/providers/registry.ts`**
   - `import { KiloProvider } from './kilo.js';`
   - Instantiate and `providers.set(kilo.getProviderName(), kilo);`.

4. **`cli/src/providers/__tests__/kilo.test.ts`** (new file)
   - Port `opencode.test.ts`, mock `getKiloDir`, assert provider name `'kilo'`,
     `sourceTool === 'kilo'`, and the ms-timestamp / `reasoning` / `step-finish`
     deltas. Include a small in-memory `kilo.db` fixture (build via
     `better-sqlite3` in the test) exercising `parseDatabaseSession` so the ms
     conversion and session-level usage are covered.

## Validation
- `pnpm --filter @code-insights/cli test:coverage` (or `cd cli && pnpm test`)
  — new `kilo.test.ts` passes.
- `pnpm --filter @code-insights/cli build` — typechecks.
- Manual smoke: `code-insights` (whatever the inspect command is, e.g.
  `insights`/`stats`) against real data should now discover kilo sessions from
  `~/.local/share/kilo/kilo.db`. Confirm `discover()` returns
  `~/.local/share/kilo/kilo.db#<sessionId>` entries and `parse` yields
  normalized messages with correct timestamps and token usage.
- After code changes run `graphify update .` (per AGENTS.md) to refresh the
  knowledge graph.

## Risks / open questions
- The `storage/...` JSON-file path in Kilo appears empty on this machine (only
  `storage/session_diff` exists; no `storage/session`), so DB is the primary
  source. Keep the JSON-path code for parity but it may not be exercised here.
- Kilo's `message`/`part` may evolve; the port pins to the schema observed on
  `7.4.11`. If a future kilo version changes `part.type` tokens, extend the
  mapper.
- Confirm the real CLI entrypoint name for a manual smoke test (check
  `cli/src/commands` / `cli/src/index.ts`) before claiming end-to-end success.
