# Graph Report - code-insights  (2026-07-21)

## Corpus Check
- 557 files · ~747,248 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4654 nodes · 8969 edges · 278 communities (250 shown, 28 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.56)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `906abb85`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- routes/facets.ts
- Community 90
- CommandPalette.tsx
- Community 92
- Community 93
- Community 94
- Community 95
- analysis/analysis-db.ts
- properties
- App.tsx
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- db/homes.ts
- scripts
- Community 122
- Community 123
- Community 126
- Community 127
- Community 128
- Community 129
- Affected Files & Tasks
- AxAgent Memory And Skills Rules (@ax-llm/ax)
- AxAgent Observability Rules (@ax-llm/ax)
- __tests__/insights.test.ts
- KiloProvider
- OpenCodeProvider
- ChatConversation.tsx
- Postmortem: Search ESCAPE Clause Bug (PR #216)
- recurring-insights.ts
- /release — Automated Release Workflow
- Migration Steps
- required
- Development Practices — Code Insights
- /start-feature — Auto-Setup Feature Development Team
- Audio I/O Codegen Rules (@ax-llm/ax)
- AxGEPA Codegen Rules (@ax-llm/ax)
- prompt-quality.json
- properties
- enum
- summary
- seed.ts
- dashboard/package.json
- Long-Term Direction
- Plan: 按 source_tool 汇整各 provider 的 cache 用量（API + 前端展示）
- Community 155
- routes/homes.ts
- routes/insights.ts
- runner.test.ts
- Review Specialists — Domain Registry
- Code Insights Vision
- keywords
- session-analysis.json
- InsightProgram
- AssistantMarkdown.tsx
- GEMINI.md
- llm/analysis.test.ts
- routes/analysis.test.ts
- facets.test.ts
- src/utils.ts
- routes/projects.ts
- analysis/response-parsers.ts
- required
- items
- Data → Insight Pipeline
- Competitive Landscape & Related Projects
- dispatch.test.ts
- routes/search.ts
- scripts
- welcome.ts
- GEPA Prompt Optimization: Analytical Deep Dive
- export.test.ts
- llm-expert.md
- Ax Refine And BestOfN
- required
- schema-sync.test.ts
- stats/index.ts
- Build and Push Docker Image Workflow
- Custom Provider Plan Draft
- devDependencies
- files
- copilot-cli.ts
- enum
- enum
- Code Insights Vision
- optimize.test.ts
- 4. Codex CLI
- Add a `kilo` session provider (mirrors `opencode`)
- recurring-insights.test.ts
- reflect.test.ts
- [4.8.3] - 2026-04-02
- enum
- ErrorBoundary
- 1. Claude Code
- 2. Copilot (VS Code)
- 3. Cursor
- 5. Copilot CLI
- PULL_REQUEST_TEMPLATE.md
- RateLimiter
- open.ts
- install-hook.test.ts
- [Unreleased]
- [4.8.0] - 2026-03-31
- [4.8.2] - 2026-04-01
- repository
- confidence
- sqlite-vec-poc.ts
- Code of Conduct
- Source Tool Format Analysis & Parser Gap Report
- 6. Crush
- 7. OpenCode
- 8. Hermes Agent
- 9. Gemini CLI
- Fix Plan
- reports.test.ts
- [4.10.0] - 2026-04-13
- [4.10.1] - 2026-04-16
- [4.9.2] - 2026-04-05
- [4.9.3] - 2026-04-05
- evidence
- telemetry.test.ts
- AGENTS.md
- batch-native-analysis.sh
- block-local-merge.sh
- block-pr-merge.sh
- check-branch-before-commit.sh
- check-rm-tracked.sh
- ci-gate.sh
- @dnd-kit/core
- @dnd-kit/sortable
- native-runner.test.ts
- react
- recharts
- remark-gfm
- @tanstack/react-query
- tw-animate-css
- CURRENT_SPRINT.md
- SessionIdBodyResponseSchema

## God Nodes (most connected - your core abstractions)
1. `cn()` - 112 edges
2. `getDb()` - 74 edges
3. `Changelog` - 47 edges
4. `Button()` - 42 edges
5. `ParsedSession` - 41 edges
6. `request()` - 40 edges
7. `trackEvent()` - 37 edges
8. `exports` - 33 edges
9. `generateTitle()` - 32 edges
10. `runInsightsCommand()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `initTestDb()` --calls--> `runMigrations()`  [EXTRACTED]
  server/src/routes/export.test.ts → cli/src/db/migrate.ts
- `applyGeneratedTitle()` --calls--> `getDb()`  [EXTRACTED]
  cli/src/analysis/analysis-db.ts → cli/src/db/client.ts
- `markInsightStale()` --calls--> `getDb()`  [EXTRACTED]
  cli/src/analysis/analysis-db.ts → cli/src/db/client.ts
- `computePQScores()` --references--> `DIMENSION_KEYS`  [EXTRACTED]
  server/src/routes/shared-aggregation.ts → cli/src/analysis/personality.ts
- `getDeletedSessionCount()` --calls--> `getDb()`  [EXTRACTED]
  cli/src/db/read.ts → cli/src/db/client.ts

## Import Cycles
- None detected.

## Communities (278 total, 28 thin omitted)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (106): costAction(), handleStatsError(), modelsAction(), overviewAction(), AggregatedData, patternsAction(), projectsAction(), todayAction() (+98 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (108): CategoryItem, CollapsibleCategoryList(), CollapsibleCategoryListProps, formatUtcDate(), formatWeekLabel(), WeekSelector(), WeekSelectorProps, ProjectPersonalitySwitcher() (+100 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (73): ContextBreakDivider(), ContextBreakDividerProps, InlineEventChip(), InlineEventChipProps, AgentMessageBubble(), AgentMessageBubbleProps, getStatusBadgeClass(), TaskNotificationCard() (+65 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (77): ActivityFeed(), ActivityFeedProps, FeedItem, insightTypeIcons, insightTypeLabels, SessionFeedItem(), DispatchDrawerProps, FloatingActionBar() (+69 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (30): Logo(), LogoProps, CoverImagePromptSection(), CoverImagePromptSectionProps, DispatchDrawer(), FORMAT_OPTIONS, INSIGHT_TYPE_COLORS, SortableInsightItemProps (+22 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (28): AntiPattern, CategoryBadge(), DIMENSION_LABELS, DimensionScores(), getScoreColor(), LegacyContent(), NewSchemaContent(), PQDimensionScores (+20 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (68): ActivityChart(), ActivityChartProps, InsightTypeChart(), InsightTypeChartProps, LABELS, AnalyticsRange, CacheBySourceCard(), CacheBySourceCardProps (+60 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (58): AnalysisContext, AnalysisContextValue, AnalysisProvider(), AnalysisState, AnalysisType, buildToastMessage(), makeKey(), makeToastId() (+50 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (44): DedupMetrics, EMPTY_DEDUP_METRICS, insertInsightsBatch(), InsightRow, saveInsightsToDb(), saveInsightsToDbWithDedup(), RelatedInsight, mockEmbedFn() (+36 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (39): formatAgentRules(), parseMetadata(), asString(), formatKnowledgeBase(), InsightRow, parseBullets(), parseMetadata(), renderDecisions() (+31 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (24): ClaudeCodeProvider, discoverJsonlFiles(), CrushProvider, MistralVibeProvider, VibeMessage, VibeMeta, antigravity, claudeCode (+16 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (57): ConversationSearch(), PostPreviewProps, HomeMultiSelect(), HomeMultiSelectProps, ProjectMultiSelect(), ProjectMultiSelectProps, SaveFilterPopover(), SaveFilterPopoverProps (+49 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (47): bandFor(), computeAutonomy(), computeAxis(), computeCraft(), computePace(), computePersonalityProfile(), computePrecision(), computeResilience() (+39 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (25): AnalysisUsageRow, getSessionAnalysisUsage(), SaveAnalysisUsageData, databaseChecks(), buildQueueCommand(), queueProcessCommand(), queuePruneCommand(), queueRetryCommand() (+17 more)

### Community 17 - "Community 17"
Cohesion: 0.04
Nodes (48): 1. Data Contract Authority, 2. Architecture Decisions, 3. Code Review — INSIDER + SYNTHESIZER Role, 4. Layer Coordination, Adding Fields, ADR Template, Anti-Patterns to Reject, Architecture Decision Records (ADR) (+40 more)

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (37): analysisChecks(), configChecks(), checkPort(), dashboardChecks(), environmentChecks(), extractBinaryPath(), hooksChecks(), providerChecks() (+29 more)

### Community 19 - "Community 19"
Cohesion: 0.04
Nodes (46): @code-insights/cli, @hono/swagger-ui, @hono/zod-openapi, @openrouter/sdk, dependencies, @code-insights/cli, hono, @hono/node-server (+38 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (27): ROUTE_TITLES, RouteEffects(), DispatchDiscoveryCallout(), DispatchDiscoveryCalloutProps, Header(), Layout(), applyTheme(), getSystemTheme() (+19 more)

### Community 21 - "Community 21"
Cohesion: 0.25
Nodes (8): installHookCommand, Cost Tracking, Device Info Tracking, insertSessionWithProject, Provider Registry, runSync, SessionEnd Hook (Analysis), Stop Hook (Sync)

### Community 22 - "Community 22"
Cohesion: 0.05
Nodes (43): CLI (`cli/`), CLI Conventions, CLI Error Handling, Code Review Protocol (MANDATORY), Component Patterns, Context Sources, CRITICAL: Never Merge PRs, Dashboard Conventions (Vite + React SPA) (+35 more)

### Community 23 - "Community 23"
Cohesion: 0.05
Nodes (43): 1. No Backward Compatibility, 2. Outdated Format Detection + Re-analysis Flag, 3. Confidence Threshold: 50%+ Filter, 4. Eight Canonical Categories (Not 12), Aggregation Changes (`shared-aggregation.ts`), `AnalysisResponse` type — `category: string` (REQUIRED, not optional), Architecture, Architecture: Hybrid (Deterministic + LLM) (+35 more)

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (40): OUTCOME_COLORS, OUTCOME_LABELS, WeekAtAGlanceStrip(), WeekAtAGlanceStripProps, ProfilePromptDialog(), ProfilePromptDialogProps, fetchAvatarAsDataUrl(), isProfileComplete() (+32 more)

### Community 25 - "Community 25"
Cohesion: 0.05
Nodes (39): Agent Health Monitoring, Branch Discipline, Ceremony Violation Flags, Collaboration with Other Agents, Communication as Team Lead, Communication Style, Constraints, Context Sources (+31 more)

### Community 26 - "Community 26"
Cohesion: 0.05
Nodes (38): 1. Create a branch, 2. Make changes, 3. Verify your changes, 4. Test locally, 5. Submit a PR, Code Style, Commit Messages, Contributing to Code Insights (+30 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (26): CustomTooltip(), formatCompact(), StatsHero(), StatsHeroProps, formatCharacterName(), WorkingStyleHighlights(), WorkingStyleHighlightsProps, CompactSessionRow() (+18 more)

### Community 28 - "Community 28"
Cohesion: 0.05
Nodes (39): 1. Cache Savings Celebration, 2. Provider Cost Comparison (V2), 3. Bulk Analyze Cost Preview, 4. Analysis Cost in Session List (Subtle), Analysis Cost Storage (Server-Side), API Endpoints Needed, Component Spec: AnalysisCostLine, Component Spec: Analyze Dropdown Cost Estimates (+31 more)

### Community 29 - "Community 29"
Cohesion: 0.08
Nodes (33): cleanTitle(), detectSessionCharacter(), EDIT_TOOLS, extractBugDescription(), extractFromUserMessage(), extractToolFilePath(), extractTopic(), generateCharacterTitle() (+25 more)

### Community 30 - "Community 30"
Cohesion: 0.05
Nodes (37): 10. Resolved Design Questions, 11. Out of Scope (This Version), 1. Problem Statement, 2. Goals, 3. The Killer Use Case, 4.1 The `.code-insights.md` File, 4.2 CLI Experience, 4.3 Dashboard Experience (+29 more)

### Community 31 - "Community 31"
Cohesion: 0.15
Nodes (33): applyVersion(), buildOptimizeCommand(), compareVersionsCmd(), deleteVersionCmd(), extractTopicsFromTranscript(), listVersionsCmd(), loadTrainingData(), runOptimize() (+25 more)

### Community 32 - "Community 32"
Cohesion: 0.15
Nodes (26): analyzeSession(), chunkMessages(), deduplicateByTitle(), DEFAULT_RETRIEVAL_CONFIG, getRetrievalConfig(), AnalysisOptions, AnalysisProgress, AnalysisResult (+18 more)

### Community 33 - "Community 33"
Cohesion: 0.17
Nodes (21): createClientFromConfig(), initRateLimiterFromConfig(), PROVIDER_API_KEY_ENV, resolveApiKey(), testLLMConfig(), createAnthropicClient(), createGeminiClient(), discoverLlamaCppModels() (+13 more)

### Community 34 - "Community 34"
Cohesion: 0.29
Nodes (7): items, type, additionalProperties, type, properties, decisions, facets

### Community 35 - "Community 35"
Cohesion: 0.06
Nodes (34): 1. User Authentication / Identity, 2. Landing Page for Archetypes, 3. Share vs Download, 4. Card Customization, 5. Cost Data on Stats Card, Card Design (Working Style), Component Architecture, Computed Milestones (Not Persistent Badges) (+26 more)

### Community 36 - "Community 36"
Cohesion: 0.09
Nodes (31): buildDegradedResponse(), buildDispatchContext(), buildDispatchSystemPrompt(), buildImagePromptContext(), buildImagePromptSystemPrompt(), DispatchInput, DispatchParseResult, FORMAT_INSTRUCTIONS (+23 more)

### Community 37 - "Community 37"
Cohesion: 0.15
Nodes (31): dashboardCommand(), DashboardOptions, isPortInUse(), buildEmbeddingConfig(), buildEmbeddingsCommand(), embeddingsBackfillCommand(), embeddingsRecomputeCommand(), embeddingsSearchCommand() (+23 more)

### Community 38 - "Community 38"
Cohesion: 0.06
Nodes (33): exports, ./analysis/analysis-db, ./analysis/analysis-usage-db, ./analysis/friction-normalize, ./analysis/message-format, ./analysis/native-runner, ./analysis/normalize-utils, ./analysis/pattern-normalize (+25 more)

### Community 39 - "Community 39"
Cohesion: 0.11
Nodes (27): buildSession(), classifyUserMessage(), extractProjectName(), extractProjectPath(), extractSessionId(), extractSlashCommandName(), extractTextContent(), extractThinkingContent() (+19 more)

### Community 40 - "Community 40"
Cohesion: 0.19
Nodes (9): ClaudeEvent, ClaudeResultEvent, extractResultFromEnvelope(), extractJsonPayload(), RunAnalysisParams, RunAnalysisResult, mockedExecFileSync, mockedExecFileSync (+1 more)

### Community 41 - "Community 41"
Cohesion: 0.50
Nodes (4): ConversationSearch, Dashboard API Client, SessionDetailPanel, useSessions

### Community 42 - "Community 42"
Cohesion: 0.06
Nodes (32): Chat View Enhancements, CLI Command Reference, Code Insights, Configuration, Core Features, Dashboard & Browser, Dashboard Views, Dispatch — LLM-Powered Post Generator (+24 more)

### Community 43 - "Community 43"
Cohesion: 0.06
Nodes (30): 1. Local-First Developer Tools, 2. AI Analyzing AI (Using LLMs to Analyze LLM Conversations), 3. Single-Repo Monorepo Evolution, 4. Multi-Source Provider Abstraction, 5. Developer Experience in Open Source, 6. Feature Parity — Porting a Web App to an Embedded Local Dashboard, Anti-Patterns to Avoid, Constraints (+22 more)

### Community 44 - "Community 44"
Cohesion: 0.09
Nodes (26): EffectivePatternRow, FrictionPointRow, getCurrentIsoWeekString(), getRoute, PersonalitySnapshotRow, projectsRoute, resolvePeriod(), trendRoute (+18 more)

### Community 45 - "Community 45"
Cohesion: 0.06
Nodes (35): [1.0.2] - 2026-02-20, [2.1.0] - 2026-02-27, [3.0.2] - 2026-02-28, [3.0.3] - 2026-02-28, [3.1.1] - 2026-03-02, [3.4.0] - 2026-03-02, [3.4.1] - 2026-03-02, [4.0.1] - 2026-03-16 (+27 more)

### Community 46 - "Community 46"
Cohesion: 0.16
Nodes (18): detectRageLoopHeuristic(), RageLoopSignal, classifyStoredUserMessage(), formatMessagesForAnalysis(), formatSessionMetaLine(), ParsedToolCall, ParsedToolResult, safeParseJson() (+10 more)

### Community 47 - "Community 47"
Cohesion: 0.67
Nodes (3): [4.6.1] - 2026-03-22, Added, Fixed

### Community 48 - "Community 48"
Cohesion: 0.07
Nodes (29): Core Design, Data Model, Dispatch — Learnings-Curated Blog Post Generator, Entry Points, Implementation Touchpoints, LLM Architecture, Mental Model, Model & Temperature (+21 more)

### Community 49 - "Community 49"
Cohesion: 0.07
Nodes (26): AxGen Codegen Rules (@ax-llm/ax), AxStepContext Mutators, AxStepContext Read-Only Properties, Caching, Canonical Pattern, Chat Log and Usage, Context Caching, Do Not Generate (+18 more)

### Community 50 - "Community 50"
Cohesion: 0.07
Nodes (29): devDependencies, jsdom, @tailwindcss/vite, @testing-library/dom, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event, @types/node (+21 more)

### Community 51 - "Community 51"
Cohesion: 0.07
Nodes (27): CLI Commands, Contributing, Dashboard, Development, Diagnostics, Embeddings, Hook Integration, Individual commands (+19 more)

### Community 52 - "Community 52"
Cohesion: 0.22
Nodes (3): HermesAgentProvider, MockDatabase, getHermesHomeDir()

### Community 53 - "Community 53"
Cohesion: 0.11
Nodes (18): CodexProvider, CodexRolloutLine, CodexSessionMeta, CodexUsage, collectRolloutFiles(), extractContent(), extractFormatBContent(), filterByProject() (+10 more)

### Community 54 - "Community 54"
Cohesion: 0.13
Nodes (18): isVerbose(), collectLexicalText(), CURSOR_MESSAGE_ARRAY_KEYS, CursorProvider, extractFilePath(), extractLexicalText(), extractMessages(), extractProjectPathFromBubbles() (+10 more)

### Community 55 - "Community 55"
Cohesion: 0.07
Nodes (26): Auto-Parallel Execution, AxFlow Codegen Rules (@ax-llm/ax), Canonical Pattern, Chat Logs, Conditional Branching, Critical Rules, Derive (Batch/Array Processing), Description and toFunction (+18 more)

### Community 56 - "Community 56"
Cohesion: 0.07
Nodes (27): Analysis (LLM-Powered), Analysis Queue Architecture, Analytics & Stats, Architecture — Code Insights, Background Worker (`cli/src/analysis/queue-worker.ts`), CLI Directory Detail (`/cli/src/`), Configuration & Telemetry, Core Resources (+19 more)

### Community 57 - "Community 57"
Cohesion: 0.07
Nodes (27): Code Insights Roadmap, Contributing, Deliverables, Deliverables, Deliverables, Deliverables, Milestones, Milestones (+19 more)

### Community 58 - "Community 58"
Cohesion: 0.10
Nodes (22): DiscoveredModel, discoverModels(), discoverOllamaModels(), app, discoverModelsRoute, getLlmConfigRoute, ollamaModelsRoute, PROVIDER_API_KEY_ENV (+14 more)

### Community 59 - "Community 59"
Cohesion: 0.15
Nodes (23): args, BUILTIN_SAMPLES, parseResponse(), runDiagnostics(), sampleIdx, verbose, InsightOutput, IMPORTANT: AxFlow's parser (vs() in @ax-llm/ax 22.0.2) scans for (+15 more)

### Community 60 - "Community 60"
Cohesion: 0.15
Nodes (17): FRICTION_ALIASES, normalizeFrictionCategory(), kebabToTitleCase(), levenshtein(), normalizeCategory(), NormalizerConfig, getPatternCategoryLabel(), normalizePatternCategory() (+9 more)

### Community 61 - "Community 61"
Cohesion: 0.11
Nodes (18): ASSET_CONTENT_TYPES, registerDocs(), require, swaggerUiDistDir, createApp(), ServerOptions, startServer(), app (+10 more)

### Community 62 - "Community 62"
Cohesion: 0.12
Nodes (19): generateFrictionWinsPrompt(), generatePersonalityPrompt(), generateRulesSkillsPrompt(), generateWorkingStylePrompt(), sampleEffectivePatterns, sampleFrictionCategories, ALL_SECTIONS, app (+11 more)

### Community 63 - "Community 63"
Cohesion: 0.08
Nodes (25): class-variance-authority, clsx, dependencies, class-variance-authority, clsx, date-fns, lucide-react, posthog-js (+17 more)

### Community 64 - "Community 64"
Cohesion: 0.08
Nodes (25): type, type, properties, applies_when, attribution, category, choice, description (+17 more)

### Community 65 - "Community 65"
Cohesion: 0.13
Nodes (24): configCommand, describeApiKeySource(), llmCommand, PROVIDER_API_KEY_ENV, runInteractiveLLMConfig(), saveLLMConfig(), showConfigAction(), disableAction() (+16 more)

### Community 66 - "Community 66"
Cohesion: 0.08
Nodes (24): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, jsx, lib, module, moduleResolution, noEmit (+16 more)

### Community 67 - "Community 67"
Cohesion: 0.08
Nodes (23): Branch Discipline, CI Simulation Gate (MANDATORY), Color & Theming, Design Workflow, "Developer Dev" — Primary User, Document Ownership, Implementation Principles, MEMORY.md (+15 more)

### Community 68 - "Community 68"
Cohesion: 0.16
Nodes (16): applyV1(), applyV10(), applyV11(), applyV12(), applyV13(), applyV2(), applyV3(), applyV4() (+8 more)

### Community 69 - "Community 69"
Cohesion: 0.08
Nodes (23): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+15 more)

### Community 70 - "Community 70"
Cohesion: 0.09
Nodes (23): @ax-llm/ax, chalk, dependencies, @ax-llm/ax, better-sqlite3, chalk, commander, hono (+15 more)

### Community 71 - "Community 71"
Cohesion: 0.09
Nodes (22): AI Provider Codegen Rules (@ax-llm/ax), Anthropic Model-Specific Behavior, AWS Bedrock, Batch Audio, Budget Levels, Chat, Common Options, Context Caching (+14 more)

### Community 72 - "Community 72"
Cohesion: 0.11
Nodes (15): DIMENSION_KEYS, loadPersonalityScopeData(), AggregatedData, AggregatedEffectivePattern, AggregatedFrictionCategory, AggregatedPQCategory, aggregatePQFindings(), buildPeriodFilter() (+7 more)

### Community 73 - "Community 73"
Cohesion: 0.09
Nodes (23): type, maximum, minimum, type, type, properties, type, type (+15 more)

### Community 74 - "Community 74"
Cohesion: 0.14
Nodes (18): deletedCountRoute, deleteRoute, getRoute, listRoute, patchRoute, IMPORTANT: registered before /{id} so "deleted" isn't matched as a session ID, SessionCharacterSchema, SourceToolSchema (+10 more)

### Community 75 - "Community 75"
Cohesion: 0.09
Nodes (22): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+14 more)

### Community 76 - "Community 76"
Cohesion: 0.09
Nodes (21): Domain Classification, Gate A: New Dependency Audit, Gate B: Functional Verification Evidence, Gate C: Visual Output Check (Conditional), If CHANGES REQUIRED (1+ FIX NOW or VERIFY AT RUNTIME items):, If PASS (0 FIX NOW items):, Important Rules, Launch Domain Specialist Reviews (1-2, Dynamic) (+13 more)

### Community 77 - "Community 77"
Cohesion: 0.09
Nodes (21): Audio Inputs And Speech Outputs, AxAgent Codegen Rules (@ax-llm/ax), Bubble Errors, Canonical Pattern, Child Agents As Tools, Clarification And Resume State, Core API Reference, Critical Rules (+13 more)

### Community 78 - "Community 78"
Cohesion: 0.13
Nodes (17): LLMChatFn, LLMMessage, LLMResponse, makeAnthropicChat(), makeChatFn(), makeGeminiChat(), makeMistralChat(), makeOllamaChat() (+9 more)

### Community 79 - "Community 79"
Cohesion: 0.09
Nodes (22): Agent Suite, CI Simulation Gate (Step 8 — BLOCKING), CRITICAL: Agents NEVER Merge PRs, Development Ceremony (MANDATORY), Document Ownership & Delegation, Dynamic Team Workflow, Multi-Agent Orchestration — Code Insights, Orchestrator Role (Main Claude) (+14 more)

### Community 81 - "Community 81"
Cohesion: 0.10
Nodes (20): 1. String-Based (Recommended for simple cases), 2. Pure Fluent Builder API, 3. Standard Schema (zod / valibot / arktype), 4. Hybrid, Arrays, Optional, and Internal Fields, Ax Signature Reference, Cached Input Fields, Common Patterns (+12 more)

### Community 82 - "Community 82"
Cohesion: 0.25
Nodes (7): Code Insights - Recent Insights, Instructions, Output Format, Recent Decisions, Recent Learnings, Recent Work Items, Usage

### Community 83 - "Community 83"
Cohesion: 0.14
Nodes (21): saveAnalysisUsage(), AntigravityNativeRunner, CodexNativeRunner, MistralVibeRunner, ClaudeNativeRunner, processQueue(), ProcessQueueOptions, AnalysisRunner (+13 more)

### Community 84 - "Community 84"
Cohesion: 0.16
Nodes (24): createInsightProgram(), ParetoPoint, classifyCompileError(), createGEPARunner(), GEPARunnerConfig, GEPARunnerResult, OptimizationErrorKind, OptimizationLogEntry (+16 more)

### Community 85 - "Community 85"
Cohesion: 0.10
Nodes (21): maximum, minimum, type, maximum, minimum, type, properties, maximum (+13 more)

### Community 86 - "Community 86"
Cohesion: 0.10
Nodes (21): required, category, confidence, description, alternatives, applies_when, attribution, choice (+13 more)

### Community 87 - "Community 87"
Cohesion: 0.10
Nodes (20): Anti-Patterns, API & Frontend, Best Practices, CLAUDE.md / GEMINI.md, CLI Integration, Core Architecture, Data Processing, Database & Storage (+12 more)

### Community 88 - "Community 88"
Cohesion: 0.15
Nodes (15): promptQualityRoute, recurringRoute, sessionAnalysisRoute, usageRoute, loadSessionForAnalysis(), loadSessionMessages(), streamBatchBackfill(), AnalysisResultSchema (+7 more)

### Community 89 - "routes/facets.ts"
Cohesion: 0.11
Nodes (20): aggregatedRoute, app, listRoute, missingPqRoute, missingRoute, outdatedPqRoute, outdatedRoute, requireLLM() (+12 more)

### Community 90 - "Community 90"
Cohesion: 0.10
Nodes (19): Ax Library (@ax-llm/ax) Quick Reference, Chaining Generators, Classification, Common Patterns, Debugging, Error Handling, Examples, Extraction (+11 more)

### Community 91 - "CommandPalette.tsx"
Cohesion: 0.07
Nodes (47): HomeSelectProps, DOT_COLORS, SOURCE_TOOLS, SourceToolSelectProps, Collapsible(), CollapsibleContent(), CollapsibleTrigger(), Select() (+39 more)

### Community 92 - "Community 92"
Cohesion: 0.10
Nodes (19): Architecture, Architecture, CLI Commands, CLI Commands, Components, Components, Configuration, Database Schema Changes (V11) (+11 more)

### Community 93 - "Community 93"
Cohesion: 0.11
Nodes (18): Behavioral Rules, Collaboration Rules, Competitive Landscape (Embedded Knowledge), Constraints, Context Sources, CRITICAL: You NEVER Merge PRs, Development Ceremony Participation, DX Audit (+10 more)

### Community 94 - "Community 94"
Cohesion: 0.18
Nodes (11): [3.3.0] - 2026-03-02, [4.10.2] - 2026-04-16, [4.5.0] - 2026-03-21, Added, Added, Changed, Fixed, Fixed (+3 more)

### Community 95 - "Community 95"
Cohesion: 0.40
Nodes (5): [4.0.0] - 2026-03-16, Added, Changed, Fixed, Improved

### Community 97 - "properties"
Cohesion: 0.12
Nodes (19): description, type, properties, description, type, description, minimum, type (+11 more)

### Community 98 - "App.tsx"
Cohesion: 0.23
Nodes (10): SearchHighlight(), SearchHighlightProps, formatRelativeDate(), INSIGHT_ICONS, InsightResultProps, InsightSearchResult(), SessionResultProps, SessionSearchResult() (+2 more)

### Community 99 - "Community 99"
Cohesion: 0.29
Nodes (7): [2.0.0] - 2026-02-26, [4.2.0] - 2026-03-19, Added, Added, Changed, Fixed, Fixed

### Community 100 - "Community 100"
Cohesion: 0.50
Nodes (4): [3.0.0] - 2026-02-28, Added, Breaking Changes, Changed

### Community 101 - "Community 101"
Cohesion: 0.50
Nodes (4): [3.3.2] - 2026-03-02, Added, Changed, Fixed

### Community 102 - "Community 102"
Cohesion: 0.50
Nodes (4): [4.3.0] - 2026-03-19, Added, Changed, Removed

### Community 103 - "Community 103"
Cohesion: 0.50
Nodes (4): [4.4.0] - 2026-03-21, Added, Fixed, Improved

### Community 104 - "Community 104"
Cohesion: 0.11
Nodes (19): ADR: Datetime Range Filter for Insights Export, Changes, Consequences, Context, Decision, Filter Semantics (Locked), Frontend State & UX, Implementation Order (Required) (+11 more)

### Community 105 - "Community 105"
Cohesion: 0.11
Nodes (18): Chunk 1: Pure Business Logic (Tier 1), Chunk 2: Route Handler Tests (Tier 2), Chunk 3: LLM Analysis Orchestration (Tier 3), Chunk 4: Gap-Filling (Tier 4), Coverage Impact Estimate, Task 10: CLI Stats Format — Expand Existing Tests, Task 11: Server Export — knowledge-base and agent-rules Tests, Task 12: Final Coverage Check and Gap Fill (+10 more)

### Community 106 - "Community 106"
Cohesion: 0.15
Nodes (16): cacheBySourceRoute, dailyRoute, dashboardRoute, Range, usageRoute, VALID_RANGES, CacheBySourceQuerySchema, CacheBySourceResponseSchema (+8 more)

### Community 107 - "Community 107"
Cohesion: 0.11
Nodes (17): author, bin, code-insights, bugs, url, description, engines, node (+9 more)

### Community 108 - "Community 108"
Cohesion: 0.14
Nodes (20): CLI_ENTRY, readStdin(), sessionEndCommand(), SessionEndOptions, spawnWorker(), WORKER_LOG_PATH, filterFilesToSync(), runSync() (+12 more)

### Community 109 - "Community 109"
Cohesion: 0.67
Nodes (3): [3.3.1] - 2026-03-02, Added, Fixed

### Community 110 - "Community 110"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 111 - "Community 111"
Cohesion: 0.67
Nodes (3): [3.5.1] - 2026-03-03, Changed, Improved

### Community 112 - "Community 112"
Cohesion: 0.67
Nodes (3): [3.6.0] - 2026-03-04, Added, Changed

### Community 113 - "Community 113"
Cohesion: 0.67
Nodes (3): [4.1.0] - 2026-03-18, Added, Changed

### Community 114 - "Community 114"
Cohesion: 0.11
Nodes (17): Blocked, Commit Strategy, Completed (Planning Phase), Custom Provider Implementation Plan, Dependencies, Phase 1: Type Updates, Phase 2: Backend Client Implementation, Phase 3: Model Discovery (+9 more)

### Community 115 - "Community 115"
Cohesion: 0.67
Nodes (3): [4.6.0] - 2026-03-22, Added, Changed

### Community 116 - "Community 116"
Cohesion: 0.22
Nodes (9): [4.11.0] - 2026-05-19, [4.7.0] - 2026-03-25, [4.9.0] - 2026-04-03, Added, Added, Added, Changed, Changed (+1 more)

### Community 117 - "Community 117"
Cohesion: 0.16
Nodes (14): buildReportContext(), buildReportSystemPrompt(), ReportSource, ReportType, sources, TYPE_LABELS, app, generateRoute (+6 more)

### Community 118 - "Community 118"
Cohesion: 0.12
Nodes (16): Artifacts And Replay, AxAgent Optimize Codegen Rules (@ax-llm/ax), Built-In Judge Pattern, Canonical Pattern, Dataset And Judge Rules, Decision Guide, Delegation Optimization Notes, Deterministic Metric Pattern (+8 more)

### Community 119 - "Community 119"
Cohesion: 0.14
Nodes (17): items, type, items, type, items, type, items, type (+9 more)

### Community 120 - "db/homes.ts"
Cohesion: 0.27
Nodes (15): buildHomeCommand(), homeAddCommand(), homeDisableCommand(), homeEnableCommand(), homeListCommand(), homeRemoveCommand(), addHome(), getHome() (+7 more)

### Community 121 - "scripts"
Cohesion: 0.12
Nodes (16): devDependencies, vitest, @vitest/coverage-v8, engines, node, pnpm, vitest, name (+8 more)

### Community 122 - "Community 122"
Cohesion: 0.12
Nodes (16): Analysis & Processing Features, CLAUDE.md — Code Insights, Commands, Configuration Hierarchy, Development Philosophy (CRITICAL), Documentation Index, Environment Configuration, Friction & Pattern Taxonomy (+8 more)

### Community 123 - "Community 123"
Cohesion: 0.12
Nodes (15): AxAgent RLM Runtime Rules (@ax-llm/ax), AxJSRuntime Security, Choosing Presets, Prompt Level, And Model Size, Context Policy Presets, Custom Code Runtimes, Do Not Generate, Dynamic Output Truncation, Examples (+7 more)

### Community 127 - "Community 127"
Cohesion: 0.24
Nodes (15): backfillAction(), backfillBatch(), backfillBatchToEndpoint(), backfillCommand, backfillPqAction(), backfillPqBatch(), checkLlmConfigured(), checkServer() (+7 more)

### Community 128 - "Community 128"
Cohesion: 0.17
Nodes (5): createAIService(), defaultLogger(), GEPARunner, OptimizationError, withTimeout()

### Community 129 - "Community 129"
Cohesion: 0.12
Nodes (16): "Cannot find package" errors in server tests, Coverage Targets, Debugging Test Failures, Domain Classification, "expected null" in parser tests, Migrations — In-Memory SQLite, Normalizers — Table-Driven Tests, Parsers — Fixture-Based Tests (+8 more)

### Community 131 - "Affected Files & Tasks"
Cohesion: 0.12
Nodes (15): 1. Type definitions — add provider ID, 2. Provider metadata — CLI constants, 3. OpenAI client — accept custom base URL, 4. Client factory — pass `baseUrl` for OpenAI and new provider, 5. Model discovery — support OpenAI-compatible endpoint, 6. Server config route — validate new provider, 7. Dashboard Settings UI — show provider, Base URL, model, 8. CLI interactive config — prompt for Base URL (+7 more)

### Community 132 - "AxAgent Memory And Skills Rules (@ax-llm/ax)"
Cohesion: 0.13
Nodes (14): Actor usage, Actor usage, AxAgent Memory And Skills Rules (@ax-llm/ax), Carrying Memories Across `.forward()` Calls, Context Map, Do Not Generate, Enabling, Enabling (+6 more)

### Community 133 - "AxAgent Observability Rules (@ax-llm/ax)"
Cohesion: 0.13
Nodes (9): Actor Turn Callback, Agent Status Callback, AxAgent Observability Rules (@ax-llm/ax), Chat Log, Usage, And Traces, Choose The Smallest Hook, Context Event Observability, Do Not Generate, Global Runtime Defaults (+1 more)

### Community 134 - "__tests__/insights.test.ts"
Cohesion: 0.13
Nodes (9): MockAntigravityRunner, MockClaudeRunner, MockCodexRunner, mockFromConfig, mockInsertMessages, mockInsertSession, mockProvider, mockProviderRunAnalysis (+1 more)

### Community 135 - "KiloProvider"
Cohesion: 0.19
Nodes (8): KiloProvider, SyncState, CONFIG_DIR, CONFIG_FILE, getKiloDir(), getVibeHomeDir(), getVibeLogsDir(), SYNC_STATE_FILE

### Community 136 - "OpenCodeProvider"
Cohesion: 0.29
Nodes (3): OpenCodeProvider, SessionUsage, getOpenCodeDir()

### Community 138 - "Postmortem: Search ESCAPE Clause Bug (PR #216)"
Cohesion: 0.13
Nodes (14): 1. No runtime verification after Round 1 fixes, 1. Post-fix functional re-verification (review process), 2. Incorrect reasoning about JS template literal escaping, 2. Server route smoke tests for non-trivial SQL (QA policy), 3. Hookify rule for template literal SQL escaping (tooling), 3. No test coverage for search route, 4. Template literal SQL awareness in review checklist (review process), Action Items (+6 more)

### Community 139 - "recurring-insights.ts"
Cohesion: 0.24
Nodes (14): cosineSimilarity(), dotProduct(), findGroupsByVectorSimilarity(), findRecurringInsights(), findRecurringInsightsByLLM(), findRecurringInsightsByVector(), InsightEmbedding, l2Norm() (+6 more)

### Community 140 - "/release — Automated Release Workflow"
Cohesion: 0.14
Nodes (13): GATE 1: Review Changelog, GATE 2: Confirm Publish, GATE 3: Verify, Important Rules, /release — Automated Release Workflow, Step 1: Pre-flight Checks, Step 2: Analyze Changes, Step 3: Apply Version Bump (+5 more)

### Community 141 - "Migration Steps"
Cohesion: 0.14
Nodes (12): FAQ, Migration Guide — v2 to v3, Migration Steps, Step 1: Install v3, Step 2: Re-initialize, Step 3: Re-sync All Sessions, Step 4: Open the Dashboard, Step 5 (Optional): Re-configure LLM Analysis (+4 more)

### Community 142 - "required"
Cohesion: 0.14
Nodes (14): required, category, confidence, description, better_prompt, impact, label, message_ref (+6 more)

### Community 143 - "Development Practices — Code Insights"
Cohesion: 0.14
Nodes (14): Branch Discipline (CRITICAL), Configuration, Development Notes, Development Practices — Code Insights, Domain Classification, Hook Integration, Hookify Rules, Pre-Action Verification (CRITICAL) (+6 more)

### Community 144 - "/start-feature — Auto-Setup Feature Development Team"
Cohesion: 0.15
Nodes (12): Dependency Audit (if NEW_DEPS), Important Rules, /start-feature — Auto-Setup Feature Development Team, Step 1: Create Git Worktree, Step 2: Create Named Team, Step 3: Spawn PM Agent, Step 4: Orchestrator Spawns Agents on PM Request, Step 5: Supervise (+4 more)

### Community 145 - "Audio I/O Codegen Rules (@ax-llm/ax)"
Cohesion: 0.15
Nodes (12): Agent Audio Inputs, Audio I/O Codegen Rules (@ax-llm/ax), Config Shape, Conversational `.chat()` Audio, Core Rules, Direct Batch APIs, Gemini Live Defaults, Grok Voice Defaults (+4 more)

### Community 146 - "AxGEPA Codegen Rules (@ax-llm/ax)"
Cohesion: 0.15
Nodes (12): AxGEPA Codegen Rules (@ax-llm/ax), Budgeting and Validation, Canonical Pareto Pattern, Canonical Scalar Pattern, Critical Rules, Good Example Targets, Metric Patterns, Metric Selection (+4 more)

### Community 147 - "prompt-quality.json"
Cohesion: 0.15
Nodes (12): additionalProperties, description, required, $schema, title, type, assessment, dimension_scores (+4 more)

### Community 148 - "properties"
Cohesion: 0.15
Nodes (13): description, type, description, maximum, minimum, type, description, minimum (+5 more)

### Community 149 - "enum"
Cohesion: 0.15
Nodes (13): enum, type, category, assumption-not-surfaced, effective-context, late-constraint, missing-acceptance-criteria, missing-context (+5 more)

### Community 150 - "summary"
Cohesion: 0.15
Nodes (13): type, content, summary, title, additionalProperties, properties, required, type (+5 more)

### Community 151 - "seed.ts"
Cohesion: 0.24
Nodes (9): getAllProviders, insertMessages, insertSessionWithProjectAndReturnIsNew, recalculateUsageStats, saveSyncState, syncState, createTestDb(), makeParsedMessage() (+1 more)

### Community 152 - "dashboard/package.json"
Cohesion: 0.15
Nodes (12): description, engines, node, name, private, scripts, build, dev (+4 more)

### Community 153 - "Long-Term Direction"
Cohesion: 0.15
Nodes (13): Long-Term Direction, Phase 10: User Experience & Shareability ✅, Phase 1: Foundation ✅, Phase 2: Integration ✅, Phase 3: Intelligence ✅, Phase 4: Feature Parity ✅, Phase 5: Telemetry ✅, Phase 6: Polish & Distribution ✅ (+5 more)

### Community 154 - "Plan: 按 source_tool 汇整各 provider 的 cache 用量（API + 前端展示）"
Cohesion: 0.15
Nodes (12): 1. 后端：新增聚合路由, 2. 前端：API 封装, 3. 前端：hook, 4. 前端：展示组件, 5. 前端：挂载到 AnalyticsPage, Context, Plan: 按 source_tool 汇整各 provider 的 cache 用量（API + 前端展示）, 决策 (+4 more)

### Community 156 - "routes/homes.ts"
Cohesion: 0.21
Nodes (11): app, createRouteDef, deleteRoute, getRoute, listRoute, patchRoute, OkSchema, HomeIdParamSchema (+3 more)

### Community 157 - "routes/insights.ts"
Cohesion: 0.18
Nodes (12): app, createInsightRoute, deleteRoute, listRoute, VALID_TYPES, InsightTypeSchema, CreateInsightResponseSchema, InsightIdParamSchema (+4 more)

### Community 158 - "runner.test.ts"
Cohesion: 0.20
Nodes (7): getVersionDir(), loadArtifact(), saveArtifact(), saveMetadata(), saveScores(), TrainingExample, TEST_DIR

### Community 159 - "Review Specialists — Domain Registry"
Cohesion: 0.17
Nodes (12): Adding a New Specialist, Node/CLI Specialist, Overview, Parser/Provider Specialist, Priority Markers, React/Frontend Specialist, Review Specialists — Domain Registry, Selection Algorithm (+4 more)

### Community 160 - "Code Insights Vision"
Cohesion: 0.21
Nodes (17): sessionExists(), getStmts(), insertMessages(), insertSessionWithProject(), insertSessionWithProjectAndReturnIsNew(), insertSessionWithProjectInternal(), truncate(), updateGlobalUsageStats() (+9 more)

### Community 161 - "keywords"
Cohesion: 0.18
Nodes (11): keywords, ai-coding, analytics, claude, claude-code, codex, copilot, cursor (+3 more)

### Community 162 - "session-analysis.json"
Cohesion: 0.18
Nodes (10): additionalProperties, description, required, $schema, title, type, decisions, facets (+2 more)

### Community 165 - "GEMINI.md"
Cohesion: 0.18
Nodes (9): Building and Running, Development Conventions, graphify, Key Commands, Key Files & Directories, LLM Providers, Project Overview, Provider Highlights (+1 more)

### Community 166 - "llm/analysis.test.ts"
Cohesion: 0.18
Nodes (6): MessageOverrides, mockChat, mockIsConfigured, SessionOverrides, VALID_ANALYSIS_RESPONSE, VALID_PQ_RESPONSE

### Community 167 - "routes/analysis.test.ts"
Cohesion: 0.18
Nodes (6): mockAnalyzePromptQuality, mockAnalyzeSession, mockCaptureError, mockFindRecurringInsights, mockIsLLMConfigured, mockLoadLLMConfig

### Community 168 - "facets.test.ts"
Cohesion: 0.18
Nodes (3): mockAnalyzePromptQuality, mockExtractFacetsOnly, mockIsLLMConfigured

### Community 169 - "src/utils.ts"
Cohesion: 0.39
Nodes (6): app, listRoute, MessageSchema, MessagesParamsSchema, MessagesQuerySchema, MessagesResponseSchema

### Community 170 - "routes/projects.ts"
Cohesion: 0.27
Nodes (9): app, getRoute, listRoute, patchRoute, ProjectIdParamSchema, ProjectResponseSchema, ProjectSchema, ProjectsListQuerySchema (+1 more)

### Community 171 - "analysis/response-parsers.ts"
Cohesion: 0.11
Nodes (25): applyGeneratedTitle(), convertPQToInsightRow(), convertToInsightRows(), DeleteOptions, deleteSessionInsights(), markInsightStale(), saveFacetsToDb(), SessionData (+17 more)

### Community 172 - "required"
Cohesion: 0.20
Nodes (10): additionalProperties, description, required, type, dimension_scores, context_provision, correction_quality, information_timing (+2 more)

### Community 173 - "items"
Cohesion: 0.22
Nodes (10): description, items, type, additionalProperties, type, findings, takeaways, description (+2 more)

### Community 175 - "Data → Insight Pipeline"
Cohesion: 0.20
Nodes (9): 1. Single-session entry point, 2. Multi-provider LLM client, 3. Prompt templates — where the taxonomy gets injected, 4. Parsing the LLM's response, 5. Storage (SQLite), 6. Background analysis queue, 7. `code-insights reflect` (cross-session synthesis), Data → Insight Pipeline (+1 more)

### Community 176 - "Competitive Landscape & Related Projects"
Cohesion: 0.20
Nodes (9): Claude Code Memory, Competitive Landscape & Related Projects, Entire.io Skills, Feature gaps this surfaces in Code Insights, Key differences from Code Insights, Notes on Related Categories, Positioning Summary, Strategic notes (+1 more)

### Community 177 - "dispatch.test.ts"
Cohesion: 0.22
Nodes (6): BASE_BODY, IMAGE_PROMPT_BODY, mockCreateLLMClient, mockIsLLMConfigured, seedPrerequisites(), seedSession()

### Community 178 - "routes/search.ts"
Cohesion: 0.29
Nodes (6): app, searchRoute, SearchInsightResultSchema, SearchQuerySchema, SearchResponseSchema, SearchSessionResultSchema

### Community 180 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, postpublish, prepublishOnly, start, test, test:coverage (+1 more)

### Community 181 - "welcome.ts"
Cohesion: 0.42
Nodes (7): getVersion(), printBanner(), purple, ensureConfigDir(), countAllSessions(), showWelcomeIfFirstRun(), touchWelcomeMarker()

### Community 182 - "GEPA Prompt Optimization: Analytical Deep Dive"
Cohesion: 0.22
Nodes (8): Artifacts and Persistence, CLI Integration, GEPA Prompt Optimization: Analytical Deep Dive, Measuring Quality: The Objectives, Overview, System Architecture, The Evolutionary Loop, Why it Matters

### Community 183 - "export.test.ts"
Cohesion: 0.22
Nodes (5): initTestDb(), mockCaptureError, mockChat, mockIsLLMConfigured, mockLoadLLMConfig

### Community 184 - "llm-expert.md"
Cohesion: 0.25
Nodes (7): Anti-Patterns You Flag, Core Expertise, How You Work, MEMORY.md, Output Standards, Persistent Agent Memory, Project Context

### Community 185 - "Ax Refine And BestOfN"
Cohesion: 0.25
Nodes (7): APIs, Ax Refine And BestOfN, Refine Advice, Reward Functions, Strategies, Streaming, Validation And Assertions

### Community 186 - "required"
Cohesion: 0.25
Nodes (8): required, course_correction_reason, effective_patterns, friction_points, had_course_correction, iteration_count, outcome_satisfaction, workflow_pattern

### Community 187 - "schema-sync.test.ts"
Cohesion: 0.25
Nodes (6): ANALYSIS_FACETS_REQUIRED, ANALYSIS_RESPONSE_TOP_LEVEL_REQUIRED, DIMENSION_SCORES_REQUIRED, __dirname, PROMPT_QUALITY_RESPONSE_TOP_LEVEL_REQUIRED, schemasDir

### Community 188 - "stats/index.ts"
Cohesion: 0.17
Nodes (12): ChatConversation(), ChatConversationProps, shouldShowDateSeparator(), ConversationSearchProps, DateSeparator(), DateSeparatorProps, LoadMoreSentinel(), LoadMoreSentinelProps (+4 more)

### Community 190 - "Build and Push Docker Image Workflow"
Cohesion: 0.25
Nodes (7): Build and Push Docker Image Workflow, Context, Goal, Implementation Plan, Notes, Required Secrets, Task 1: Create workflow file

### Community 191 - "Custom Provider Plan Draft"
Cohesion: 0.25
Nodes (7): Approach, Custom Provider Plan Draft, Decisions Made, Forks (User Decisions Needed), Metadata, Pending Actions, TL;DR (For humans)

### Community 192 - "devDependencies"
Cohesion: 0.29
Nodes (7): devDependencies, @types/better-sqlite3, @types/node, typescript, @types/better-sqlite3, @types/node, typescript

### Community 193 - "files"
Cohesion: 0.29
Nodes (7): files, dist, CHANGELOG.md, dashboard-dist, LICENSE, README.md, server-dist

### Community 194 - "copilot-cli.ts"
Cohesion: 0.26
Nodes (9): collectEventsFiles(), CopilotCliProvider, CopilotEvent, extractText(), filterByProject(), getCopilotHome(), parseCopilotSession(), parseTimestamp() (+1 more)

### Community 195 - "enum"
Cohesion: 0.29
Nodes (7): type, enum, type, deficit, improve, reinforce, strength

### Community 197 - "enum"
Cohesion: 0.29
Nodes (7): enum, type, outcome, abandoned, blocked, partial, success

### Community 198 - "Code Insights Vision"
Cohesion: 0.17
Nodes (11): 1. Privacy by Architecture, 2. Developers Can Handle It, 3. Single-Repo, Local-First, 4. Tool, Not Platform, Code Insights Vision, Core Beliefs, Non-Goals, Philosophy (+3 more)

### Community 200 - "4. Codex CLI"
Cohesion: 0.29
Nodes (7): 4. Codex CLI, DB Quality, Format A: New JSONL (v0.104.0+, 2026), Format B: Old JSON (pre-2025, April 2025), Formats (Two Distinct Versions), Gaps, Parser State: BROKEN

### Community 201 - "Add a `kilo` session provider (mirrors `opencode`)"
Cohesion: 0.29
Nodes (6): Add a `kilo` session provider (mirrors `opencode`), Context, Format deltas vs OpenCode (must handle in the parser), Implementation steps, Risks / open questions, Validation

### Community 203 - "reflect.test.ts"
Cohesion: 0.33
Nodes (4): mockChat, mockIsLLMConfigured, seedMultipleSessions(), seedSessionWithFacets()

### Community 204 - "[4.8.3] - 2026-04-02"
Cohesion: 0.33
Nodes (6): [3.6.1] - 2026-03-04, [4.8.3] - 2026-04-02, Added, Changed, Changed, Fixed

### Community 205 - "enum"
Cohesion: 0.33
Nodes (6): enum, type, impact, high, low, medium

### Community 207 - "ErrorBoundary"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 208 - "1. Claude Code"
Cohesion: 0.33
Nodes (6): 1. Claude Code, DB Quality, Format, Gaps: None, Structure, What the Parser Handles

### Community 209 - "2. Copilot (VS Code)"
Cohesion: 0.33
Nodes (6): 2. Copilot (VS Code), DB Quality, Format, Gaps, Structure, What the Parser Handles

### Community 210 - "3. Cursor"
Cohesion: 0.33
Nodes (6): 3. Cursor, DB Quality, Format, Gaps, Structure, What the Parser Handles

### Community 211 - "5. Copilot CLI"
Cohesion: 0.33
Nodes (6): 5. Copilot CLI, DB Quality, Format, Gaps, Structure, What the Parser Handles

### Community 212 - "PULL_REQUEST_TEMPLATE.md"
Cohesion: 0.33
Nodes (5): Notes for reviewer, Related issue, Test plan, Type of change, What does this PR do?

### Community 215 - "open.ts"
Cohesion: 0.10
Nodes (22): CLAUDE_SETTINGS_DIR, ClaudeSettings, CLI_ENTRY, getHookCommand(), hookAlreadyInstalled(), HookConfig, HOOKS_FILE, InstallHookOptions (+14 more)

### Community 216 - "install-hook.test.ts"
Cohesion: 0.60
Nodes (4): hooksFile(), _mockOs, readSettings(), writeSettings()

### Community 217 - "[Unreleased]"
Cohesion: 0.50
Nodes (4): [4.10.4] - 2026-05-06, Fixed, Fixed, [Unreleased]

### Community 218 - "[4.8.0] - 2026-03-31"
Cohesion: 0.50
Nodes (4): [4.8.0] - 2026-03-31, Added, Changed, Fixed

### Community 219 - "[4.8.2] - 2026-04-01"
Cohesion: 0.50
Nodes (4): [4.8.2] - 2026-04-01, Added, Changed, Fixed

### Community 220 - "repository"
Cohesion: 0.50
Nodes (4): repository, directory, type, url

### Community 221 - "confidence"
Cohesion: 0.50
Nodes (4): maximum, minimum, type, confidence

### Community 222 - "sqlite-vec-poc.ts"
Cohesion: 0.83
Nodes (3): embed(), main(), vecToBlob()

### Community 223 - "Code of Conduct"
Cohesion: 0.50
Nodes (3): Code of Conduct, Enforcement, Reporting

### Community 224 - "Source Tool Format Analysis & Parser Gap Report"
Cohesion: 0.50
Nodes (3): Recommended Execution Order, Source Tool Format Analysis & Parser Gap Report, Summary

### Community 225 - "6. Crush"
Cohesion: 0.50
Nodes (4): 6. Crush, Format, Gaps: None (Newly Implemented), What the Parser Handles

### Community 226 - "7. OpenCode"
Cohesion: 0.50
Nodes (4): 7. OpenCode, Format, Gaps: None (Newly Implemented), What the Parser Handles

### Community 227 - "8. Hermes Agent"
Cohesion: 0.50
Nodes (4): 8. Hermes Agent, Format, Gaps: None (Newly Implemented), What the Parser Handles

### Community 228 - "9. Gemini CLI"
Cohesion: 0.50
Nodes (4): 9. Gemini CLI, Format, Gaps: None (Newly Implemented), What the Parser Handles

### Community 229 - "Fix Plan"
Cohesion: 0.50
Nodes (4): Fix Plan, PR 1: Codex CLI Parser Rewrite (Critical — conversations completely broken), PR 2: Cursor Provider Fixes (High — project mapping and content broken), PR 3: Copilot VS Code & Copilot CLI Metadata Fixes (Medium — data completeness)

### Community 235 - "[4.10.0] - 2026-04-13"
Cohesion: 0.67
Nodes (3): [4.10.0] - 2026-04-13, Added, Fixed

### Community 236 - "[4.10.1] - 2026-04-16"
Cohesion: 0.67
Nodes (3): [4.10.1] - 2026-04-16, Added, Improved

### Community 237 - "[4.9.2] - 2026-04-05"
Cohesion: 0.67
Nodes (3): [4.9.2] - 2026-04-05, Fixed, Improved

### Community 238 - "[4.9.3] - 2026-04-05"
Cohesion: 0.67
Nodes (3): [4.9.3] - 2026-04-05, Fixed, Improved

### Community 239 - "evidence"
Cohesion: 0.67
Nodes (3): items, type, evidence

### Community 252 - "native-runner.test.ts"
Cohesion: 0.40
Nodes (3): mockExecFileSync, mockUnlinkSync, mockWriteFileSync

## Knowledge Gaps
- **1980 isolated node(s):** `block-local-merge.sh script`, `block-pr-merge.sh script`, `check-branch-before-commit.sh script`, `check-rm-tracked.sh script`, `ci-gate.sh script` (+1975 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DIMENSION_KEYS` connect `Community 72` to `Community 15`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `getAggregatedData()` connect `Community 72` to `routes/facets.ts`, `Community 62`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `block-local-merge.sh script`, `block-pr-merge.sh script`, `check-branch-before-commit.sh script` to the rest of the system?**
  _1980 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05172413793103448 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.037345860246623605 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.05170441546556852 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.04145189003436426 - nodes in this community are weakly interconnected._