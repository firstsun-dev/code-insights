<div align="center">
  <img src="docs/assets/logo.svg" width="120" height="120" alt="Code Insights logo" />
  <h1>Code Insights</h1>
  <p><strong>Turn your AI coding sessions into actionable knowledge.</strong></p>
  <p>
    <a href="https://deepwiki.com/b08x/code-insights"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
    <a href="https://github.com/melagiri/code-insights/blob/master/LICENSE"><img src="https://img.shields.io/github/license/melagiri/code-insights" alt="License" /></a>
    <a href="https://www.npmjs.com/package/@code-insights/cli"><img src="https://img.shields.io/npm/v/@code-insights/cli" alt="NPM Version" /></a>
    <a href="https://github.com/melagiri/code-insights/actions/workflows/ci.yml"><img src="https://github.com/melagiri/code-insights/actions/workflows/ci.yml/badge.svg" alt="Build Status" /></a>
  </p>
</div>

Code Insights is a local-first analytics platform designed to extract structured decisions, learnings, and prompt quality scores from your AI coding sessions. It surfaces cross-session patterns, friction points, and effective habits while tracking costs across multiple LLM providers—all without your data ever leaving your machine.

---

## Features

- **Automated Session Discovery** — Seamlessly parses history from Claude Code, Cursor, Codex CLI, and GitHub Copilot.
- **Structural Insight Extraction** — Distills raw session logs into methodological narratives, capturing collaborative dynamics and workflow milestones using SFL-compliant analysis.
- **Rage Loop Detection** — Heuristically identifies temporal loops and context stasis, surfaces "Sunk Cost Alerts" in the dashboard to help you break unproductive cycles.
- **AI Fluency Scoring** — Tracks your evolution in AI collaboration through multi-dimensional prompt quality metrics anchored by hard systemic linguistics constraints.
- **Structured Takeaways** — Extracts findings with Ideational, Interpersonal, and Textual breakdowns for deep architectural learning.
- **Cross-Session Pattern Synthesis** — Identifies recurring friction points and effective patterns across weeks of work.
- **Rule Generation** — Automatically exports high-signal patterns as custom rules for your `CLAUDE.md` or `.cursorrules`.
- **Zero-Cost Local Analysis** — Native support for Ollama allows for full AI analysis using local models like Llama 3.
- **Semantic Embeddings** — Vector-based embeddings via Ollama (`embeddinggemma:latest`, 768-dim) enable KNN similarity search over insights and messages, with sqlite-vec for fast local retrieval.
- **Prompt Optimization (GEPA)** — Automatically evolve insight-generation prompts using multi-objective optimization (coverage, precision, actionability, brevity) powered by `@ax-llm/ax`.
- **Vector-Based Recurring Insights** — Replaces expensive LLM-only clustering with sqlite-vec KNN + MMR deduplication; LLM is used only for theme naming (~90% token reduction).
- **Privacy by Architecture** — Persistence is handled via a local SQLite database at `~/.code-insights/data.db`; no accounts or cloud sync required. Schema V11 adds vector table support and embedding status tracking.

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

<details>
<summary><b>Quick Start (npx)</b></summary>

The fastest way to try Code Insights without a permanent installation:
```bash
npx @code-insights/cli
```
</details>

<details>
<summary><b>Global Installation (NPM)</b></summary>

```bash
npm install -g @code-insights/cli
code-insights
```
</details>

<details>
<summary><b>PNPM (Recommended for development)</b></summary>

```bash
pnpm add -g @code-insights/cli
code-insights
```
</details>

<details>
<summary><b>Docker</b></summary>

Multi-arch images (`linux/amd64`, `linux/arm64`) are published to GitHub Container Registry:
```bash
docker pull ghcr.io/firstsun-dev/code-insights:latest
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
  - `--source [name]`: Limit sync to a specific provider (e.g., `cursor`, `claude`).
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
  - `--port [num]`: Set custom server port (default: 7890).

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

Vector embeddings enable KNN similarity search over your insights and messages. Requires an Ollama instance with an embedding model.

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
- Set `OLLAMA_BASE_URL` environment variable (default: `http://tinybot:11434`)
- Default embedding model: `embeddinggemma:latest` (768-dim)

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

**Optimization objectives (scored 0-1):**
- **Coverage** — % of session content captured in generated insights
- **Precision** — % of insights that are non-trivial (not filler)
- **Actionability** — % of insights with concrete, actionable takeaways
- **Brevity** — inverse of total insight token count (normalized)

**Supported providers:** `openai`, `anthropic`, `mistral`, `deepseek`, `cohere`, `google-gemini`

## Configuration File

The system maintains its state and preferences in `~/.code-insights/config.json`. While most configuration is handled via the CLI, you can manually adjust settings for custom LLM providers or dashboard ports.

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
- `dashboard.llm.provider`: The primary provider for generating reflections and rules. Supports `openai`, `anthropic`, `google`, `openrouter`, and `ollama`.
- `dashboard.llm.apiKey`: Your API key for the selected provider (stored locally).

---

## Integration Deep-Dives

### Claude Code Subscription Optimization
For developers using Claude Code, the `install-hook` command enables a high-efficiency workflow. By injecting a post-session hook, Code Insights leverages your active Claude session context to perform analysis with zero additional API cost and zero manual effort.

### Ollama & Local Analysis
The platform automatically detects local Ollama instances. If a supported model (e.g., `llama3.3`) is found, Code Insights can prioritize local execution for all insight extraction and pattern synthesis—ensuring your session data never leaves your infrastructure.

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

Code Insights is built on a "local-first" philosophy. All session data, metadata, and derived insights are stored in a local SQLite database. Telemetry is limited to anonymous usage metrics and can be disabled via `code-insights telemetry disable`. LLM analysis content is sent only to your configured provider via their official SDKs.

## Contributing

Contributions are welcome. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on the monorepo structure and local development setup.

## License

MIT — Copyright (c) 2026 melagiri
