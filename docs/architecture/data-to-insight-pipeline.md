# Data → Insight Pipeline

How Code Insights turns a raw AI coding session (JSONL/SQLite from the source
tool) into structured, LLM-derived insights (friction points, effective
patterns, prompt quality, facets, session title).

```
raw session (messages)
  → load from SQLite
  → format + heuristic pre-signals (rage-loop detection)
  → build prompt (taxonomy injected)
  → call LLM (with provider/runner fallback chain)
  → parse response (JSON extraction + repair)
  → normalize categories against canonical taxonomy
  → write to SQLite (insights / session_facets / analysis_usage)
```

## 1. Single-session entry point

`cli/src/commands/insights.ts` — `runInsightsCommand()` is the orchestrator:

- Loads the session row and its messages (`loadSessionForAnalysis`,
  `loadSessionMessages`).
- Picks an analysis runner: either a native CLI-agent runner (Claude Code
  `-p`, Codex, Antigravity, Mistral Vibe — see `src/analysis/*-runner.ts`)
  or `ProviderRunner.fromConfig()` for a configured API-key LLM.
- Formats messages via `formatMessagesForAnalysis()`
  (`src/analysis/message-format.ts`) and runs heuristic rage-loop detection
  (`src/analysis/loop-detector.ts`) to inject a pre-computed signal into the
  prompt.
- Makes **two LLM passes per session**:
  1. `buildSessionAnalysisInstructions` — extracts facets, friction points,
     effective patterns, summary, decisions, learnings, and auto-generates
     the session title.
  2. `buildPromptQualityInstructions` — scores the quality of the user's
     prompts in the session.

  Both share `SHARED_ANALYST_SYSTEM_PROMPT` and a cacheable conversation
  block (`buildCacheableConversationBlock`) to reduce token cost.
- Each raw LLM response is parsed (`parseAnalysisResponse` /
  `parsePromptQualityResponse`), converted to DB rows
  (`convertToInsightRows`, `convertPQToInsightRow`), written via
  `saveInsightsToDb` / `saveFacetsToDb`, old rows for the session deleted
  (`deleteSessionInsights`), the session title updated
  (`updateSessionTitle`), and token/cost usage logged
  (`saveAnalysisUsage`).
- `performAnalysis` implements a multi-level provider fallback chain
  (Codex → Claude → Antigravity → Mistral Vibe) triggered on usage-limit
  errors.
- **Resume detection**: in hook mode, re-analysis is skipped if
  `analysis_usage.session_message_count` already matches the current
  message count, unless `--force` is passed.

## 2. Multi-provider LLM client

There are two parallel implementations of the same provider set (OpenAI,
Anthropic, Gemini, Ollama, OpenRouter, Mistral, OpenAI-compatible):

- `cli/src/analysis/provider-runner.ts` — `ProviderRunner`, used by the
  CLI. Inline `fetch`-based dispatch (`makeOpenAIChat`, `makeAnthropicChat`,
  `makeGeminiChat`, `makeOllamaChat`, `makeOpenRouterChat`,
  `makeMistralChat`), selected via `makeChatFn()`.
- `server/src/llm/client.ts` — `createLLMClient`, used by the dashboard
  server (delegates to per-provider files under `server/src/llm/providers/`).
  Used by `reflect`.

These are intentionally duplicated because the CLI cannot depend on the
server package (would create a circular dependency) — tracked as issue
#240. API keys resolve env-var-first (`OPENAI_API_KEY`,
`ANTHROPIC_API_KEY`, etc.), falling back to a stored config key; Ollama
needs none.

## 3. Prompt templates — where the taxonomy gets injected

- `cli/src/analysis/prompt-constants.ts` defines the canonical taxonomies
  as guidance blocks injected verbatim into the prompt:
  - `FRICTION_CLASSIFICATION_GUIDANCE` — the 9 friction categories
    (`wrong-approach`, `knowledge-gap`, `stale-assumptions`,
    `incomplete-requirements`, `context-loss`, `scope-creep`,
    `repeated-mistakes`, `documentation-gap`, `tooling-limitation`, plus
    `rage-loop`), with disambiguation rules and an attribution decision
    tree (`user-actionable` / `ai-capability` / `environmental`).
  - `EFFECTIVE_PATTERN_CLASSIFICATION_GUIDANCE` — the 8 effective pattern
    categories (`structured-planning`, `incremental-implementation`,
    `verification-workflow`, `systematic-debugging`, `self-correction`,
    `context-gathering`, `domain-expertise`, `effective-tooling`).
  - `PROMPT_QUALITY_CLASSIFICATION_GUIDANCE` — the prompt-quality rubric.
- `cli/src/analysis/prompts.ts` string-interpolates these constants into
  `buildSessionAnalysisInstructions()` and `buildFacetOnlyInstructions()`,
  together with an explicit `<output_schema>` JSON example. The LLM is
  required to wrap its answer in `<json>...</json>` tags.

## 4. Parsing the LLM's response

`cli/src/analysis/response-parsers.ts`:

1. `extractJsonPayload()` tries, in order: content inside `<json>` tags →
   markdown code fences → the largest balanced `{...}` block → a truncated
   fallback.
2. `preProcessJson()` fixes common LLM JSON mistakes (unescaped quotes,
   literal newlines).
3. `JSON.parse` is attempted first; on failure, the `jsonrepair` package
   repairs trailing commas, unclosed braces, and truncation, then
   `JSON.parse` is retried.
4. On unrecoverable failure, the error is logged with context and the full
   payload is dumped to `~/.code-insights/debug/` for inspection.
5. Category strings returned by the LLM are fuzzy-normalized against the
   canonical taxonomy (`friction-normalize.ts`, `pattern-normalize.ts`,
   `prompt-quality-normalize.ts`): exact match → alias map → Levenshtein
   distance ≤ 2 → substring match → otherwise kept as a novel/emergent
   category rather than dropped.

## 5. Storage (SQLite)

Defined in `cli/src/db/schema.ts` / `cli/src/db/migrate.ts`:

- `insights` — one row per extracted item (`type` = `summary`, `decision`,
  `learning`, `prompt_quality`, etc.), with `title`, `content`, `bullets`,
  `confidence`, `metadata`, `embedding_status`.
- `session_facets` (migration V3) — `outcome_satisfaction`,
  `workflow_pattern`, `friction_points` / `effective_patterns` (JSON
  blobs).
- `analysis_usage` (V7/V8) — provider/model/token counts/cost per
  session + analysis type; also backs resume detection.
- `reflect_snapshots` (V4) — cached cross-session synthesis output per
  period/project.
- `analysis_queue` (V9) — the async job table (see below).

## 6. Background analysis queue

- `session-end.ts` enqueues a job (`enqueue(sessionId, 'native' |
  'provider')`) and spawns a detached worker subprocess.
- `cli/src/analysis/queue-worker.ts` — `processQueue()` loops
  `claimNext()` from `analysis_queue`, calls the **same**
  `runInsightsCommand()` used by the direct `code-insights insights`
  command (reusing the exact fetch → prompt → parse → store pipeline
  above), and marks jobs `completed` / `failed` with the same retry /
  fallback logic as the inline `performAnalysis` chain.

## 7. `code-insights reflect` (cross-session synthesis)

`reflect` is architecturally similar but not the same code path:

- `cli/src/commands/reflect.ts` is a thin client that calls the dashboard
  server's SSE endpoint `POST /api/reflect/generate`
  (`server/src/routes/reflect.ts`).
- The server aggregates `session_facets` / `insights` across many sessions
  (`getAggregatedData`), then runs three separate LLM synthesis passes —
  friction-wins, rules-skills, working-style — using prompts in
  `server/src/llm/reflect-prompts.ts` and `createLLMClient()` from
  `server/src/llm/client.ts`.
- It reuses the same conventions (JSON wrapped in `<json>` tags,
  `jsonrepair` fallback in `server/src/llm/response-parsers.ts`) but a
  **different prompt set** (built for aggregated multi-session synthesis,
  not single-session extraction), and results are cached in
  `reflect_snapshots` rather than `insights`.

## Summary

The core trick that makes this reliable is: **structured prompt with an
injected canonical taxonomy + a strictly required JSON output schema +
tolerant parsing (`jsonrepair`) + fuzzy category normalization**. This
lets an inherently non-deterministic LLM output land as clean, queryable,
structured rows in SQLite.
