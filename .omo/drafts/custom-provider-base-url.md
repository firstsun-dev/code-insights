# Custom Provider Plan Draft

## Metadata
- **Intent**: clear
- **Review Required**: false
- **Status**: awaiting-approval
- **Created**: 2026-07-20

## TL;DR (For humans)
Add a "Custom (OpenAI-compatible)" provider to the AI Analysis Provider settings, allowing users to specify a custom base_url and use any OpenAI-compatible API endpoint (e.g., local LLM servers, self-hosted solutions like vLLM, TGI, etc.).

## Approach
1. Add 'custom' to LLMProvider type across all layers
2. Update SettingsPage UI to show custom provider option with base_url input
3. Implement custom client factory in server using OpenAI SDK with custom base_url
4. Add model discovery for custom endpoints
5. Update validation and test endpoints to support custom provider

## Decisions Made
- Custom provider requires both apiKey AND baseUrl (unlike Ollama which doesn't need API key)
- Use OpenAI SDK's base_url parameter for compatibility
- Model discovery uses /v1/models endpoint (OpenAI standard)
- Custom provider appears after Mistral in the provider dropdown

## Pending Actions
- [ ] Write .omo/plans/custom-provider-base-url.md with full todos
- [ ] Get user approval
- [ ] Execute implementation

## Forks (User Decisions Needed)
1. **Provider name display**: "Custom (OpenAI-compatible)" vs "Custom Endpoint" vs "OpenAI-compatible API"?
2. **API key requirement**: Should custom provider require API key, or make it optional like Ollama?
3. **Model discovery**: Should we try /v1/models, or also fallback to /models (some servers use different endpoints)?
