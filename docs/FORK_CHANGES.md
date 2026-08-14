# Firstsun Fork Changes

This repository is a maintained fork of [`melagiri/code-insights`](https://github.com/melagiri/code-insights), originally created by Srikanth Rao M.

The upstream project provides the local-first foundation: session discovery for major AI coding tools, local SQLite persistence, terminal analytics, a Hono API server, a React dashboard, insight extraction, prompt-quality analysis, recurring reflection, and cost tracking.

The Firstsun fork extends that foundation rather than replacing its authorship.

## Major additions in this fork

The current Firstsun line adds or substantially extends the following areas:

- additional session providers, including Gemini CLI, Hermes Agent, OpenCode, Kilo, Crush, Antigravity, and Mistral Vibe
- semantic embeddings for insights and messages with Ollama and `sqlite-vec`
- KNN retrieval, MMR-style deduplication, and vector-assisted recurring insight synthesis
- GEPA-based prompt optimization with coverage, precision, actionability, and brevity objectives
- rage-loop and repeated-friction detection
- behavioral, personality, MBTI, cognitive-function, and longitudinal profile analysis
- richer reporting, filtering, project grouping, home-directory grouping, and editable metadata
- expanded LLM-provider support, including OpenRouter, Mistral, and OpenAI-compatible endpoints
- Docker and Docker Compose support, multi-architecture image publishing, and repository CI workflows
- additional migrations, tests, architecture notes, postmortems, and operational documentation

This list is intentionally high level. The Git history and repository comparison remain the source of truth for exact file-level changes.

## Distribution

- The npm package `@code-insights/cli` is the upstream distribution and may not contain Firstsun-only features.
- The image `ghcr.io/firstsun-dev/code-insights:latest` and source builds from this repository track the Firstsun fork.

## Attribution and maintenance

- **Original project:** [`melagiri/code-insights`](https://github.com/melagiri/code-insights)
- **Original author:** Srikanth Rao M
- **Fork maintainer:** Firstsun Dev / `firstsun-dev`
- **License:** MIT; original copyright and license notices are retained

The fork may selectively incorporate compatible upstream changes while continuing its own product direction.
