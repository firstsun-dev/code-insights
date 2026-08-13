<div align="center">
  <img src="docs/assets/logo.svg" width="120" height="120" alt="Code Insights logo" />
  <h1>Code Insights</h1>
  <p><strong>Turn your AI coding sessions into actionable knowledge.</strong></p>
  <p>
    <a href="https://deepwiki.com/b08x/code-insights"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
    <a href="https://github.com/melagiri/code-insights/blob/master/LICENSE"><img src="https://img.shields.io/github/license/melagiri/code-insights" alt="License" /></a>
    <a href="https://www.npmjs.com/package/@code-insights/cli"><img src="https://img.shields.io/npm/v/@code-insights/cli" alt="Upstream NPM Version" /></a>
    <a href="https://github.com/firstsun-dev/code-insights/actions/workflows/build-and-push-image.yml"><img src="https://github.com/firstsun-dev/code-insights/actions/workflows/build-and-push-image.yml/badge.svg" alt="FirstSun Build Status" /></a>
  </p>
</div>

Code Insights is a local-first analytics platform designed to extract structured decisions, learnings, prompt quality scores, and recurring patterns from AI coding sessions. Session data and derived insights are stored in a local SQLite database by default. Optional telemetry and user-configured remote LLM providers are the only features that may send data outside the machine.

> [!NOTE]
> **FirstSun-maintained fork**
>
> This repository is a maintained fork of [`melagiri/code-insights`](https://github.com/melagiri/code-insights), originally created by Srikanth Rao M. It preserves the upstream local-first foundation and also incorporates work from multiple contributors. The maintainer-authored additions are called out separately in [Feature Lineage](#feature-lineage); other functionality remains attributed to its original commit authors.
>
> Original authorship and license notices are retained. See [FirstSun Fork Changes](docs/FORK_CHANGES.md) for more detail about the fork.

---

## Feature Lineage

### Upstream foundation

The original project provides the core platform that this fork builds on:

- session discovery and parsing for Claude Code, Cursor, Codex CLI, Copilot CLI, and VS Code Copilot Chat
- local SQLite persistence for projects, sessions, messages, insights, usage, and cost data
- terminal analytics, a Hono API server, and a React dashboard
- structured insight extraction, prompt-quality analysis, cross-session reflection, and rule generation
- Claude Code hook integration and optional local analysis through Ollama

### FirstSun fork additions

The list below is limited to maintainer-authored commits in this fork. Features inherited from upstream or introduced by other contributors are intentionally excluded from this attribution list.

- **Personality Analysis** — Deterministic personality trait scoring, dedicated snapshots and API routes, dashboard radar/gauge/trend views, MBTI and eight Jungian cognitive-function views, ranked MBTI candidates, week/project navigation, and an optional LLM-vote scoring mode.
- **Multi-Home Directory Support** — Home-directory registry and CLI management, per-home sync, homes API and settings UI, home-aware filters and reports, nested NAS/cloud-sync roots, and full-history home-aware analytics.
- **Kilo Session Integration** — Kilo session discovery and parsing from its SQLite data, reasoning/thinking mapping, token and model capture, tests, and cost fallback when usage exists but the source records zero cost.
- **OpenAI-Compatible Analysis Support** — Configurable OpenAI-compatible endpoints and models across CLI/dashboard/server, plus batch `insights --all` analysis.
- **Dashboard and Reporting Workflows** — Dynamic multi-select source filters, sortable analytics tables, collapsible insight groups, home-aware work reports, cache-usage-by-provider analytics, and session/date-range workflow fixes.
- **Analysis Reliability and Data Integrity** — Stale-analysis tracking and badges, analyzed-session status fixes, Codex/Copilot message-ID collision fixes, Codex multi-turn parsing corrections, and personality cache invalidation across schema/scoring changes.
- **Pricing and Cost Tracking** — Added and refreshed model pricing for OpenAI/Codex, Claude, Gemini, GLM/Z.ai, plus provider-aware cache-cost reporting and pricing source documentation.
- **API and Deployment Operations** — OpenAPI/Swagger documentation, Docker and Docker Compose deployment, periodic sync sidecar, multi-architecture GHCR publishing, stale-image cleanup, and CI/build workflow maintenance.

## Supported AI Tools

| Tool | Data Location |
|------|---------------|
| Claude Code | `~/.claude/projects/**/*.jsonl` |
| Cursor | Workspace storage SQLite (macOS, Linux, Windows) |
| Codex CLI | `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` |
| Copilot CLI | `~/.copilot/session-state/{id}/events.jsonl` |
| VS Code Copilot Chat | Platform-specific Copilot Chat storage |
| Gemini CLI | `~/.gemini/tmp/<project_hash>/chats/*.json` |
| Hermes Agent | `~/.hermes/state.db` and `~/.hermes/profiles/<profile_name>/state.db` |
| OpenCode | `~/.local/share/opencode/storage/session/*.json` |
| Kilo | `~/.local/share/kilo/kilo.db` |
| Crush | Project-specific `.crush/crush.db` |

## Demo

<div align="center">
  <table>
    <tr>
      <td width="50%">
        <h4 align="center">Session Analysis</h4>
        <img src="docs/assets/screenshots/session-insight-light.png" alt="Session Insight" />
      </td>
      <td width="50%">
        <h4 align="center">Pattern Detection</h4>
        <img src="docs/assets/screenshots/patterns-light.png" alt="Pattern Detection" />
      </td>
    </tr>
  </table>
</div>

## Installation

Choose the distribution that matches the version you intend to run:

| Distribution | Tracks | Notes |
|---|---|---|
| `npx @code-insights/cli` / npm | Upstream package | May not include FirstSun-only additions listed above. |
| `ghcr.io/firstsun-dev/code-insights:latest` | FirstSun fork | Multi-architecture container built from this repository. |
| Source build from this repository | FirstSun fork | Best choice for development and inspecting the complete fork implementation. |

<details>
<summary><b>Upstream package: Quick Start with npx</b></summary>

The fastest way to try the upstream package without a permanent installation:

```bash
npx @code-insights/cli
```
</details>

<details>
<summary><b>Upstream package: Global NPM installation</b></summary>

```bash
npm install -g @code-insights/cli
code-insights
```
</details>

<details>
<summary><b>FirstSun fork: Docker</b></summary>

Multi-architecture images (`linux/amd64`, `linux/arm64`) are published to GitHub Container Registry:

```bash
docker pull ghcr.io/firstsun-dev/code-insights:latest
```
</details>

<details>
<summary><b>FirstSun fork: Build from source</b></summary>

Requires Node.js 20.19+ and pnpm 8+.

```bash
git clone https://github.com/firstsun-dev/code-insights.git
cd code-insights
pnpm install
pnpm build
node cli/dist/index.js
```
</details>

## Usage

Code Insights operates through a unified command-line interface. Use `code-insights --help` for the full command reference.

### Primary Workflow

```bash
code-insights install-hook    # Automated sync for Claude Code users
code-insights sync            # Manual discovery of new sessions
code-insights reflect         # Generate weekly pattern analysis
code-insights dashboard       # Launch visual analytics at localhost:7890
```

### Options & Command Groups

#### Data & Synchronization
- `sync`: Discovers and imports sessions from all supported providers.
  - `--source [name]`: Limit sync to a specific provider (for example, `cursor` or `claude`).
- `reset`: Clears all synced data and resets the local SQLite database.

#### Analysis & Insights
- `insights [id]`: Triggers a deep AI analysis of a specific session.
- `reflect`: Synthesizes patterns across all sessions for a given timeframe.
  - `--week [YYYY-W##]`: Analyze a specific week (default: current).
- `stats`: Displays terminal-based analytics for quick review.
  - `today`, `cost`, `projects`: Filtered views for terminal output.

#### Integration
- `install-hook`: Installs an executable hook into Claude Code for zero-latency session analysis.
- `dashboard`: Starts the Hono-based API server and serves the React frontend.
  - `--port [num]`: Set a custom server port (default: 7890).

### Examples

**Analyze cost breakdown for the current month:**

```bash
code-insights stats cost
```

**Generate a rule-set for the previous week:**

```bash
code-insights reflect --week 2026-W13
```

**Sync only from Cursor and open the dashboard:**

```bash
code-insights sync --source cursor && code-insights dashboard
```

## Embeddings & Semantic Search

Vector embeddings enable KNN similarity search over insights and messages. This workflow requires an Ollama instance with an embedding model.

```bash
# Backfill pending embeddings (insights, messages, or both)
code-insights embeddings backfill
code-insights embeddings backfill --entity insights
code-insights embeddings backfill --entity messages

# Show embedding coverage and vector index stats
code-insights embeddings status

# Force re-compute stale embeddings
code-insights embeddings recompute --all

# KNN similarity search (for testing/debugging)
code-insights embeddings search "how to handle auth"
code-insights embeddings search "error handling patterns" --top-k 10
```

**Ollama configuration:**
- Set `OLLAMA_BASE_URL` (default: `http://tinybot:11434`).
- The default embedding model is `embeddinggemma:latest` with 768 dimensions.

## Prompt Optimization (GEPA)

Automatically evolve insight-generation prompts using multi-objective optimization powered by `@ax-llm/ax`.

```bash
# Run optimization on your session data
code-insights optimize run

# Customize student/teacher models
code-insights optimize run --provider openai --student-model gpt-4o-mini --teacher-model claude-sonnet-4-20250514

# Show current optimization state
code-insights optimize status

# List, apply, compare, and delete versions
code-insights optimize list
code-insights optimize apply <version-id>
code-insights optimize compare
code-insights optimize delete <version-id>
```

**Optimization objectives (scored 0–1):**
- **Coverage** — Percentage of session content captured in generated insights.
- **Precision** — Percentage of insights that are non-trivial rather than filler.
- **Actionability** — Percentage of insights with concrete takeaways.
- **Brevity** — Inverse of total insight token count, normalized for comparison.

**Supported providers:** `openai`, `anthropic`, `mistral`, `deepseek`, `cohere`, `google-gemini`

## Configuration File

The system maintains its state and preferences in `~/.code-insights/config.json`. Most configuration is handled through the CLI, but the file can also be edited directly for custom LLM providers or dashboard ports.

```json
{
  "sync": {
    "autoAnalyze": true,
    "sources": ["claude", "cursor", "copilot"]
  },
  "dashboard": {
    "port": 7890,
    "llm": {
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-latest"
    }
  }
}
```

### Configuration Options

- `sync.autoAnalyze`: Automatically trigger AI analysis upon session discovery (default: `true`).
- `dashboard.llm.provider`: Primary provider for generating reflections and rules. Supports `openai`, `anthropic`, `google`, `openrouter`, and `ollama`.
- `dashboard.llm.apiKey`: API key for the selected provider, stored locally.

---

## Integration Deep-Dives

### Claude Code Subscription Optimization

For developers using Claude Code, the `install-hook` command enables a high-efficiency workflow. By injecting a post-session hook, Code Insights can use the active Claude session context to perform analysis with no separate API charge and no manual trigger.

### Ollama & Local Analysis

The platform can detect a configured local Ollama instance and use it for insight extraction and pattern synthesis. When both analysis and embeddings use local providers and telemetry is disabled, session content can remain within the local environment.

---

## Architecture

```text
Session Sources (Claude, Cursor, Copilot, Gemini CLI, Hermes, OpenCode, Crush)
             │
             ▼
      ┌─────────────┐
      │ CLI Engine  │  Discovery, Parsing, DB Persistence
      └──────┬──────┘
             │
             ▼
      ┌─────────────────────────────────────┐
      │ SQLite DB (V11)                     │  ~/.code-insights/data.db
      │  ┌──────────┐  ┌──────────────────┐ │
      │  │ Tables   │  │ Vector Tables    │ │
      │  │ projects │  │ vec_insights     │ │
      │  │ sessions │  │ vec_messages     │ │
      │  │ messages │  │ (sqlite-vec KNN) │ │
      │  │ insights │  └──────────────────┘ │
      │  └──────────┘                       │
      └──────┬──────────────────────────────┘
             │
      ┌──────┴───────────────┐
      ▼                      ▼
┌────────────┐        ┌──────────────┐
│ Terminal   │        │ Hono Server  │  LLM Proxy, REST API
│ Analytics  │        └──────┬───────┘
└────────────┘               │
                             ▼
                      ┌──────────────┐
                      │ React SPA    │  Visual Dashboard
                      └──────────────┘

── External Services (optional) ──
┌────────────┐  ┌──────────────┐  ┌─────────────┐
│ Ollama     │  │ LLM Provider │  │ GEPA        │
│ Embeddings │  │ (Analysis)   │  │ Optimization│
│ (768-dim)  │  │              │  │ (@ax-llm/ax)│
└────────────┘  └──────────────┘  └─────────────┘
```

## Privacy

Code Insights follows a local-first model:

- session data, metadata, and derived insights are stored in the local SQLite database
- there is no account or built-in cloud-sync requirement
- anonymous usage telemetry can be disabled with `code-insights telemetry disable`
- analysis content is sent to a remote service only when the user configures a remote LLM provider
- Ollama and other local providers can be used when content must remain within the local environment

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the monorepo structure and local development setup. Fork-specific direction and attribution are documented in [FirstSun Fork Changes](docs/FORK_CHANGES.md).

## License

MIT. The original project copyright and license notices are retained. FirstSun fork modifications are contributed under the same license.
