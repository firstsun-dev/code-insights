# Add OpenAI Compatible Provider

## Goal

Allow users to configure an "OpenAI Compatible" analysis provider in the dashboard and CLI, supporting custom `base_url` and `api_key`. This covers services like Together AI, Groq, Fireworks, local vLLM/llama-server, or any OpenAI-format API.

## Scope

- **In scope:** New `openai-compatible` provider ID, UI entry in dashboard Settings, CLI interactive config, model discovery via `{baseUrl}/v1/models`, client reuse of OpenAI implementation with custom base URL.
- **Out of scope:** Streaming, function calling, vision, or any provider-specific features beyond basic chat completions.

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Provider ID | `openai-compatible` | Explicit, self-documenting. |
| Client implementation | Reuse `createOpenAIClient` with `baseUrl` param | Avoids duplicating request/response parsing logic. |
| Default `baseUrl` | `https://api.openai.com` (fallback) | Keeps behavior safe if user forgets to set it. |
| API key requirement | Required | Almost all OpenAI-compatible endpoints require auth. |
| Env var shortcut | None (`OPENAI_COMPATIBLE_API_KEY` not added) | No standard env var exists for generic compatible endpoints. |
| Model discovery | `GET {baseUrl}/v1/models` | Standard OpenAI-compatible endpoint. |
| UI placement | Same dropdown as other providers; Base URL shown as text input (like Ollama) | Consistent with existing patterns. |

## Affected Files & Tasks

### 1. Type definitions — add provider ID

**`cli/src/types.ts`**
- Add `'openai-compatible'` to `LLMProvider` union (line 333).

**`dashboard/src/lib/types.ts`**
- Add `'openai-compatible'` to `LLMConfig.provider` union (line 328).

### 2. Provider metadata — CLI constants

**`cli/src/constants/llm-providers.ts`**
- Add new entry to `PROVIDERS` array:
  ```ts
  {
    id: 'openai-compatible',
    name: 'OpenAI Compatible',
    requiresApiKey: true,
    apiKeyLink: undefined,
    models: [
      { id: 'custom', name: 'Custom model', description: 'Enter your model ID below' },
    ],
  }
  ```

### 3. OpenAI client — accept custom base URL

**`server/src/llm/providers/openai.ts`**
- Change signature: `createOpenAIClient(apiKey: string, model: string, baseUrl?: string)`
- Replace hardcoded `https://api.openai.com/v1/chat/completions` with:
  ```ts
  const base = (baseUrl || 'https://api.openai.com').trim().replace(/\/$/, '');
  const response = await fetch(`${base}/v1/chat/completions', ...);
  ```

### 4. Client factory — pass `baseUrl` for OpenAI and new provider

**`server/src/llm/client.ts`**
- In `createClientFromConfig`:
  - `case 'openai'`: pass `config.baseUrl` to `createOpenAIClient`
  - Add `case 'openai-compatible'`: pass `config.baseUrl` to `createOpenAIClient`

### 5. Model discovery — support OpenAI-compatible endpoint

**`server/src/llm/discover.ts`**
- Add `case 'openai-compatible'` alongside `case 'openai'`:
  ```ts
  case 'openai-compatible': {
    const base = baseUrl || 'https://api.openai.com';
    const res = await fetch(`${base}/v1/models`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    // parse same shape as OpenAI
  }
  ```

### 6. Server config route — validate new provider

**`server/src/routes/config.ts`**
- Add `'openai-compatible'` to `VALID_PROVIDERS` (line 10).
- Do NOT add to `PROVIDER_API_KEY_ENV` (no standard env var).

### 7. Dashboard Settings UI — show provider, Base URL, model

**`dashboard/src/pages/SettingsPage.tsx`**
- Add `'openai-compatible'` to `LLMProvider` type (line 24).
- Add provider entry to `PROVIDERS` array (after `openai` or at end).
- Add Base URL text input for `openai-compatible` provider (similar to Ollama section, without CORS collapsible). Place it after API Key input.
- The existing cloud-provider auto-discovery (`cloudDiscoveredModels`) will automatically work once the backend supports it.

### 8. CLI interactive config — prompt for Base URL

**`cli/src/commands/config.ts`**
- In `runInteractiveLLMConfig`, extend the Base URL prompt condition:
  ```ts
  if (provider === 'ollama' || provider === 'openai-compatible') {
    // prompt for baseUrl
  }
  ```
- For `openai-compatible`, label the prompt clearly (e.g. "Base URL (e.g. https://api.together.ai):").

## Validation

1. **Typecheck:** `pnpm run build` (or equivalent typecheck command if present).
2. **Tests:** `pnpm test` — ensure no existing tests break.
3. **Manual smoke test:**
   - Open dashboard Settings → select "OpenAI Compatible" → enter base URL + API key + model → Save & Test → verify connectivity.
   - Run `code-insights config llm --provider openai-compatible --model <model> --api-key <key> --base-url <url>` and confirm it saves.
   - Verify model discovery populates the dropdown when a valid endpoint is provided.

## Rollback

- No database migrations required; config is JSON-based.
- Removing the provider from the UI and type unions is sufficient to disable it. Existing configs using `openai-compatible` will fall through to the `default` case in `createClientFromConfig` and throw a clear error.
