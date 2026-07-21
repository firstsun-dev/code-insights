# Custom Provider Implementation Plan

## TL;DR (For humans)
Add a "Custom (OpenAI-compatible)" provider that allows users to configure any OpenAI-compatible API endpoint with a custom base_url. Users can connect to self-hosted LLM servers (vLLM, TGI, local OpenAI-compatible APIs) by providing the endpoint URL and API key.

## Scope
**Must Have**:
- Add 'custom' provider type across all layers (CLI types, server, dashboard)
- SettingsPage UI with provider selection, model input, API key field, and base_url field
- Server-side client factory using OpenAI SDK with custom base_url
- Model discovery with fallback to /models endpoint
- Test connectivity endpoint support
- Save/load custom provider config

**Must NOT Have**:
- Cost estimation for custom providers (unknown pricing)
- Model list dropdown (users type model names manually, like Ollama)
- Provider-specific model presets
- Automatic provider detection

## Work State

### Completed (Planning Phase)
- ✅ Plan created and reviewed
- ✅ Codebase exploration completed
- ✅ Exact change locations identified
- ✅ Scope refined (no cost estimation, no model dropdown)
- ✅ All 15 implementation tasks defined

### Ready for Execution (Awaiting `/start-work`)
- ⏳ Phase 1: Type updates (tasks 1-2)
- ⏳ Phase 2: Backend client (tasks 3-5)
- ⏳ Phase 3: Model discovery (task 6)
- ⏳ Phase 4: Frontend UI (tasks 7-12)
- ⏳ Phase 5: Server routes (tasks 13-14)
- ⏳ Phase 6: Testing (task 15)

### Blocked
- None - ready to execute when user runs `/start-work`

## Todo Checklist

### Phase 1: Type Updates
1. **cli/src/types.ts:333** - Add 'custom' to LLMProvider type
   - Change: `export type LLMProvider = 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'llamacpp' | 'openrouter' | 'mistral'`
   - To: `export type LLMProvider = 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'llamacpp' | 'openrouter' | 'mistral' | 'custom'`
   - Acceptance: TypeScript compiles without errors
   - QA: Run `npm run type-check` in cli/

2. **dashboard/src/lib/types.ts:290** - Add 'custom' to LLMConfig provider type
   - Change: `provider?: 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'llamacpp';`
   - To: `provider?: 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'llamacpp' | 'openrouter' | 'mistral' | 'custom';`
   - Acceptance: TypeScript compiles without errors
   - QA: Run `npm run type-check` in dashboard/

### Phase 2: Backend Client Implementation
3. **server/src/llm/client.ts** - Add custom client factory
   - Create new file: `server/src/llm/providers/custom.ts`
   - Implement `createCustomClient(apiKey: string, model: string, baseUrl: string): LLMClient`
   - Use OpenAI SDK: `new OpenAI({ apiKey, baseURL: baseUrl })`
   - Return client with same interface as other providers
   - Acceptance: Can chat with custom endpoint using OpenAI-compatible API
   - QA: Test with local vLLM server or similar

4. **server/src/llm/client.ts:103-120** - Add custom case to createClientFromConfig
   - Add case: `case 'custom': return createCustomClient(apiKey ?? '', config.model, config.baseUrl ?? '');`
   - Acceptance: switch statement handles 'custom' provider
   - QA: Unit test for client creation

5. **server/src/llm/client.ts:21-27** - Add custom to PROVIDER_API_KEY_ENV
   - Add: `custom: 'CUSTOM_API_KEY'` (optional, for env var fallback)
   - Acceptance: API key resolution works for custom provider
   - QA: Test with env var and with config apiKey

### Phase 3: Model Discovery
6. **server/src/llm/discover.ts** - Add custom provider discovery
   - Add case in discoverModels function (after mistral case, before default)
   - Try /v1/models first, fallback to /models on failure
   - Use baseUrl from params
   - Return empty array if both fail
   - Acceptance: Returns models from custom endpoint
   - QA: Test with vLLM (/v1/models) and local server (/models)

### Phase 4: Frontend UI
7. **dashboard/src/pages/SettingsPage.tsx:25** - Add 'custom' to LLMProvider type
   - Change local type to include 'custom'
   - Acceptance: TypeScript compiles
   - QA: Type check passes

8. **dashboard/src/pages/SettingsPage.tsx:35-115** - Add Custom provider to PROVIDERS array
   - Add entry after Mistral:
   ```typescript
   {
     id: 'custom',
     name: 'Custom (OpenAI-compatible)',
     requiresApiKey: true,
     apiKeyLink: undefined,
     models: [] // No presets, users type custom model names
   }
   ```
   - Acceptance: Provider appears in dropdown
   - QA: UI renders correctly

9. **dashboard/src/pages/SettingsPage.tsx:144-156** - Add state for custom provider fields
   - Already have: llmBaseUrl state (line 148)
   - Need: Ensure baseUrl is shown for custom provider
   - Acceptance: State variables exist
   - QA: State updates correctly

10. **dashboard/src/pages/SettingsPage.tsx:452-469** - Update provider selection UI
    - No change needed: Select component already iterates PROVIDERS
    - Acceptance: Custom provider appears in dropdown
    - QA: Visual verification

11. **dashboard/src/pages/SettingsPage.tsx:471-574** - Add base_url input for custom provider
    - Add condition: Show base_url input when llmProvider === 'custom'
    - Add label: "API Base URL"
    - Add placeholder: "e.g., http://localhost:8000/v1"
    - Add validation: Required for custom provider
    - Acceptance: URL input appears when custom selected
    - QA: Form validation works

12. **dashboard/src/pages/SettingsPage.tsx:242-287** - Update validation for custom provider
    - Add check: if (llmProvider === 'custom' && !llmBaseUrl) return error
    - Acceptance: Cannot save without base_url for custom
    - QA: Validation error shows

### Phase 5: Server Routes
13. **server/src/routes/config.ts:11** - Add 'custom' to VALID_PROVIDERS
    - Change: `const VALID_PROVIDERS = ['openai', 'anthropic', 'gemini', 'ollama', 'llamacpp', 'openrouter', 'mistral']`
    - To: `const VALID_PROVIDERS = ['openai', 'anthropic', 'gemini', 'ollama', 'llamacpp', 'openrouter', 'mistral', 'custom']`
    - Acceptance: Custom provider passes validation
    - QA: PUT /config/llm accepts custom provider

14. **server/src/routes/config.ts:13-19** - Add custom to PROVIDER_API_KEY_ENV
    - Add: `custom: 'CUSTOM_API_KEY'`
    - Acceptance: API key source detection works
    - QA: GET /config/llm returns apiKeySource correctly

### Phase 6: Testing & Verification
15. **Run full verification**
    - Frontend: `cd dashboard && npm run type-check && npm run build`
    - Backend: `cd server && npm run type-check && npm run build`
    - CLI: `cd cli && npm run type-check`
    - Acceptance: All type checks and builds pass
    - QA: Manual test with custom endpoint

## Dependencies
- OpenAI SDK already installed (used by openai provider)
- No new npm packages needed
- Requires: OpenAI-compatible API endpoint (vLLM, TGI, etc.)

## Commit Strategy
- One commit per phase (6 commits total)
- Commit messages follow conventional commits: `feat: add custom provider support`
- Each phase is independently testable

## Start Command
After approval, user runs: `/start-work` to execute this plan
