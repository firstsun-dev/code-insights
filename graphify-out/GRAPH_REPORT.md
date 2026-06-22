# Graph Report - code-insights  (2026-06-22)

## Corpus Check
- 375 files · ~249,604 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2157 nodes · 5765 edges · 117 communities (102 shown, 15 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 110 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e7747dac`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 110|Community 110]]
- [[_COMMUNITY_Community 111|Community 111]]
- [[_COMMUNITY_Community 112|Community 112]]
- [[_COMMUNITY_Community 113|Community 113]]
- [[_COMMUNITY_Community 114|Community 114]]
- [[_COMMUNITY_Community 115|Community 115]]
- [[_COMMUNITY_Community 116|Community 116]]
- [[_COMMUNITY_Community 117|Community 117]]
- [[_COMMUNITY_Community 118|Community 118]]
- [[_COMMUNITY_Community 119|Community 119]]
- [[_COMMUNITY_Community 121|Community 121]]
- [[_COMMUNITY_Community 123|Community 123]]
- [[_COMMUNITY_Community 155|Community 155]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 107 edges
2. `getDb()` - 68 edges
3. `ParsedSession` - 38 edges
4. `trackEvent()` - 38 edges
5. `runMigrations()` - 35 edges
6. `Button()` - 32 edges
7. `generateTitle()` - 31 edges
8. `Changelog` - 28 edges
9. `runSync()` - 27 edges
10. `detectSessionCharacter()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `parseLLMJson()` --calls--> `extractJsonPayload()`  [INFERRED]
  server/src/routes/reflect.ts → cli/src/analysis/response-parsers.ts
- `getWeekKey()` --calls--> `startOfWeek()`  [INFERRED]
  dashboard/src/pages/JournalPage.tsx → cli/src/commands/stats/data/aggregation-helpers.ts
- `getWeekLabel()` --calls--> `startOfWeek()`  [INFERRED]
  dashboard/src/pages/JournalPage.tsx → cli/src/commands/stats/data/aggregation-helpers.ts
- `applyGeneratedTitle()` --calls--> `getDb()`  [INFERRED]
  server/src/routes/analysis.ts → cli/src/db/client.ts
- `initTestDb()` --calls--> `runMigrations()`  [INFERRED]
  server/src/llm/analysis.test.ts → cli/src/db/migrate.ts

## Import Cycles
- None detected.

## Communities (117 total, 15 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.17
Nodes (14): detectRageLoopHeuristic(), RageLoopSignal, classifyStoredUserMessage(), formatSessionMetaLine(), ParsedToolCall, ParsedToolResult, safeParseJson(), SessionMetadata (+6 more)

### Community 1 - "Community 1"
Cohesion: 0.15
Nodes (20): AntigravityProvider, VibeMessage, VibeMeta, SessionProvider, ParsedMessage, SessionUsage, ToolCall, ToolResult (+12 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (107): costAction(), handleStatsError(), modelsAction(), overviewAction(), AggregatedData, patternsAction(), projectsAction(), todayAction() (+99 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (48): buildSession(), classifyUserMessage(), extractProjectName(), extractProjectPath(), extractSessionId(), extractSlashCommandName(), extractTextContent(), extractThinkingContent() (+40 more)

### Community 4 - "Community 4"
Cohesion: 0.19
Nodes (6): Config Manager, GeminiCliProvider, hooksFile(), _mockOs, readSettings(), writeSettings()

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (24): cn(), Alert(), AlertDescription(), AlertTitle(), alertVariants, AlertDialogMedia(), AlertDialogOverlay(), CardAction() (+16 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (31): formatAgentRules(), parseMetadata(), asString(), formatKnowledgeBase(), InsightRow, parseBullets(), parseMetadata(), renderDecisions() (+23 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (45): AnalysisContext, AnalysisContextValue, AnalysisState, AnalysisType, useAnalysis(), AnalyzeButton(), AnalyzeButtonProps, AnalyzeDropdown() (+37 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (35): InsightScope, SessionCharacter, TitleSource, ToolCall, ToolResult, AgentToolPanel(), AgentToolPanelProps, getAgentDisplayName() (+27 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (42): ActivityChart(), ActivityChartProps, InsightTypeChart(), InsightTypeChartProps, LABELS, ErrorCard(), ErrorCardProps, CHART_COLORS (+34 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (63): useAnalyzeSession(), useAnalysisQueue(), useQueuedSessionIds(), Range, useDashboardStats(), ExportGenerateState, ExportGenerateStatus, ExportParams (+55 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (18): ClaudeCodeProvider, discoverJsonlFiles(), CrushProvider, antigravity, claudeCode, codex, copilot, copilotCli (+10 more)

### Community 12 - "Community 12"
Cohesion: 0.22
Nodes (9): AnalysisProvider(), captureDashboardLoaded(), capturePageView(), initTelemetry(), SessionDetailPage(), ROUTE_TITLES, RouteEffects(), queryClient (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (33): INSIGHT_TYPE_LABELS, ActivityFeedProps, INSIGHT_TYPES, InsightTypePillsProps, DecisionContent(), FIELD_CONFIG, LearningContent(), OUTCOME_CONFIG (+25 more)

### Community 14 - "Community 14"
Cohesion: 0.16
Nodes (16): ProfilePromptDialogProps, useProjectMutation(), UserProfile, patchSession(), EditProjectDialog(), EditProjectDialogProps, EditSessionDialogProps, RenameSessionDialogProps (+8 more)

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (22): deleteSessionInsights(), saveFacetsToDb(), saveAnalysisUsage(), formatMessagesForAnalysis(), analyzeSession(), chunkMessages(), deduplicateByTitle(), DEFAULT_RETRIEVAL_CONFIG (+14 more)

### Community 16 - "Community 16"
Cohesion: 0.16
Nodes (10): CodexNativeRunner, GeminiNativeRunner, MistralVibeRunner, AnalysisRunner, RunAnalysisParams, RunAnalysisResult, mockedExecFileSync, mockedReadFileSync (+2 more)

### Community 17 - "Community 17"
Cohesion: 0.05
Nodes (43): FRICTION_ALIASES, normalizeFrictionCategory(), kebabToTitleCase(), levenshtein(), normalizeCategory(), NormalizerConfig, getPatternCategoryLabel(), normalizePatternCategory() (+35 more)

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (24): dashboardCommand(), DashboardOptions, isPortInUse(), buildEmbeddingsCommand(), initCommand(), InitOptions, CLAUDE_SETTINGS_DIR, ClaudeSettings (+16 more)

### Community 19 - "Community 19"
Cohesion: 0.17
Nodes (29): applyVersion(), compareVersionsCmd(), deleteVersionCmd(), listVersionsCmd(), showStatus(), ABComparisonResult, activateVersion(), compareVersions() (+21 more)

### Community 20 - "Community 20"
Cohesion: 0.23
Nodes (10): useSearch(), CommandPalette(), CommandPaletteProps, NAV_ITEMS, pushRecent(), readRecent(), RecentItem, ResultItem (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (15): ClaudeEvent, ClaudeNativeRunner, ClaudeResultEvent, extractResultFromEnvelope(), Cost Tracking, Device Info Tracking, insertSessionWithProject, installHookCommand (+7 more)

### Community 22 - "Community 22"
Cohesion: 0.25
Nodes (8): useCommandPalette(), Header(), Layout(), useTheme(), ThemeToggle(), Props, Toaster(), TooltipProvider()

### Community 23 - "Community 23"
Cohesion: 0.09
Nodes (28): AntiPattern, CategoryBadge(), DIMENSION_LABELS, getScoreColor(), LegacyContent(), NewSchemaContent(), PQDimensionScores, PQFinding (+20 more)

### Community 24 - "Community 24"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 25 - "Community 25"
Cohesion: 0.21
Nodes (20): createClientFromConfig(), initRateLimiterFromConfig(), PROVIDER_API_KEY_ENV, resolveApiKey(), testLLMConfig(), getRateLimiter(), resetRateLimiter(), setRateLimiter() (+12 more)

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (15): app, app, Range, VALID_RANGES, app, VALID_TYPES, app, app (+7 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (18): buildSession(), CodexProvider, CodexRolloutLine, CodexSessionMeta, CodexUsage, collectRolloutFiles(), extractContent(), extractFormatBContent() (+10 more)

### Community 28 - "Community 28"
Cohesion: 0.29
Nodes (7): statusCommand(), DB_DIR, DB_PATH, getDbPath(), MigrationResult, getProjects(), loadSyncState()

### Community 29 - "Community 29"
Cohesion: 0.09
Nodes (36): ProfilePromptDialog(), SESSION_CHARACTER_LABELS, isProfileComplete(), normalizeGithubUsername(), readStorage(), useUserProfile(), PQDimensionScores, deduplicateToolsForIcons() (+28 more)

### Community 30 - "Community 30"
Cohesion: 0.15
Nodes (15): applyV1(), applyV10(), applyV11(), applyV2(), applyV3(), applyV4(), applyV5(), applyV6() (+7 more)

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (24): configCommand, describeApiKeySource(), llmCommand, PROVIDER_API_KEY_ENV, runInteractiveLLMConfig(), saveLLMConfig(), showConfigAction(), disableAction() (+16 more)

### Community 32 - "Community 32"
Cohesion: 0.07
Nodes (47): LlmNudgeBanner(), LlmNudgeBannerProps, TITLES, InsightTypePills(), SavedFiltersDropdown(), SavedFiltersDropdownProps, SaveFilterPopover(), SaveFilterPopoverProps (+39 more)

### Community 33 - "Community 33"
Cohesion: 0.23
Nodes (14): __dirname, __filename, insightsCheckCommand(), insightsCommand(), InsightsCommandOptions, isAlreadyAnalyzed(), loadSchema(), loadSessionForAnalysis() (+6 more)

### Community 34 - "Community 34"
Cohesion: 0.13
Nodes (16): LLMChatFn, LLMMessage, LLMResponse, makeAnthropicChat(), makeChatFn(), makeGeminiChat(), makeMistralChat(), makeOllamaChat() (+8 more)

### Community 35 - "Community 35"
Cohesion: 0.10
Nodes (28): AGENT_PARTICIPANT_COLORS, INSIGHT_TYPE_COLORS, OUTCOME_DOT, SESSION_CHARACTER_COLORS, SOURCE_TOOL_COLORS, ActivityFeed(), FeedItem, insightTypeIcons (+20 more)

### Community 36 - "Community 36"
Cohesion: 0.10
Nodes (25): Logo(), LogoProps, useMissingFacets(), FilterConfig, useFilterParams(), useInsights(), useProjects(), useSessions() (+17 more)

### Community 37 - "Community 37"
Cohesion: 0.23
Nodes (12): useFacetAggregation(), useReflectSnapshot(), useReflectWeeks(), WeekInfo, formatRelativeDate(), getCurrentIsoWeek(), parseIsoWeekBounds(), PatternsPage() (+4 more)

### Community 38 - "Community 38"
Cohesion: 0.29
Nodes (6): getSystemTheme(), Theme, ThemeContext, ThemeContextValue, ThemeProvider(), ThemeProviderProps

### Community 39 - "Community 39"
Cohesion: 0.07
Nodes (55): DedupMetrics, DeleteOptions, EMPTY_DEDUP_METRICS, insertInsightsBatch(), InsightRow, markInsightStale(), saveInsightsToDb(), saveInsightsToDbWithDedup() (+47 more)

### Community 40 - "Community 40"
Cohesion: 0.21
Nodes (16): filterFilesToSync(), runSync(), syncCommand(), SyncOptions, SyncResult, syncSingleFile(), TrivialSession, updateSyncState() (+8 more)

### Community 41 - "Community 41"
Cohesion: 0.50
Nodes (4): Dashboard API Client, ConversationSearch, SessionDetailPanel, useSessions

### Community 42 - "Community 42"
Cohesion: 0.43
Nodes (4): getCurrentProjectName(), openCommand(), OpenOptions, openUrl()

### Community 43 - "Community 43"
Cohesion: 0.10
Nodes (20): uninstallHookCommand(), cleanTitle(), detectSessionCharacter(), EDIT_TOOLS, extractBugDescription(), extractFromUserMessage(), extractToolFilePath(), extractTopic() (+12 more)

### Community 44 - "Community 44"
Cohesion: 0.20
Nodes (17): isVerbose(), collectLexicalText(), CURSOR_MESSAGE_ARRAY_KEYS, CursorProvider, extractFilePath(), extractLexicalText(), extractMessages(), extractProjectPathFromBubbles() (+9 more)

### Community 45 - "Community 45"
Cohesion: 0.11
Nodes (18): [1.0.2] - 2026-02-20, [2.1.0] - 2026-02-27, [3.0.2] - 2026-02-28, [3.0.3] - 2026-02-28, [3.1.1] - 2026-03-02, [3.4.1] - 2026-03-02, [3.6.1] - 2026-03-04, [4.0.1] - 2026-03-16 (+10 more)

### Community 46 - "Community 46"
Cohesion: 0.26
Nodes (12): statusAction(), buildEventPreview(), detectHook(), detectProviders(), getCliVersion(), getPostHogClient(), getStableMachineId(), isTelemetryEnabled() (+4 more)

### Community 47 - "Community 47"
Cohesion: 0.67
Nodes (3): [4.6.1] - 2026-03-22, Added, Fixed

### Community 48 - "Community 48"
Cohesion: 0.14
Nodes (11): classifyCompileError(), createAIService(), defaultLogger(), GEPARunner, OptimizationError, OptimizationErrorKind, OptimizationLogEntry, OptimizationLogger (+3 more)

### Community 49 - "Community 49"
Cohesion: 0.21
Nodes (14): sessionExists(), getStmts(), insertSessionWithProject(), insertSessionWithProjectInternal(), updateGlobalUsageStats(), upsertProject(), upsertSession(), CONFIG_DIR (+6 more)

### Community 52 - "Community 52"
Cohesion: 0.20
Nodes (16): processQueue(), ProcessQueueOptions, buildQueueCommand(), queueProcessCommand(), queuePruneCommand(), queueRetryCommand(), queueStatusCommand(), claimNext() (+8 more)

### Community 54 - "Community 54"
Cohesion: 0.07
Nodes (40): TEAMMATE_BORDER_COLORS, TEAMMATE_DEFAULT_COLORS, ContextBreakDivider(), ContextBreakDividerProps, InlineEventChip(), InlineEventChipProps, AssistantMarkdown(), AssistantMarkdownProps (+32 more)

### Community 55 - "Community 55"
Cohesion: 0.13
Nodes (20): convertPQToInsightRow(), convertToInsightRows(), SessionData, AnalysisResponse, ContentBlock, ParseError, ParseResult, PromptQualityDimensionScores (+12 more)

### Community 56 - "Community 56"
Cohesion: 0.27
Nodes (14): backfillAction(), backfillBatch(), backfillBatchToEndpoint(), backfillCommand, backfillPqAction(), backfillPqBatch(), checkLlmConfigured(), checkServer() (+6 more)

### Community 57 - "Community 57"
Cohesion: 0.16
Nodes (11): ChatConversation(), ChatConversationProps, ConversationSearchProps, DateSeparator(), DateSeparatorProps, LoadMoreSentinel(), LoadMoreSentinelProps, Message (+3 more)

### Community 58 - "Community 58"
Cohesion: 0.23
Nodes (13): loadLLMConfig(), applyGeneratedTitle(), app, FacetRow, loadSessionForAnalysis(), loadSessionMessages(), ProgressMessageFn, requireLLM() (+5 more)

### Community 59 - "Community 59"
Cohesion: 0.24
Nodes (15): isLLMConfigured(), cosineSimilarity(), dotProduct(), findGroupsByVectorSimilarity(), findRecurringInsights(), findRecurringInsightsByLLM(), findRecurringInsightsByVector(), InsightEmbedding (+7 more)

### Community 61 - "Community 61"
Cohesion: 0.29
Nodes (13): InsightOutput, ACTIONABLE_PATTERNS, clamp01(), EVIDENCE_PATTERNS, FILLER_PATTERNS, MetricInput, multiObjectiveMetric(), normalizeInsights() (+5 more)

### Community 63 - "Community 63"
Cohesion: 0.13
Nodes (9): MockClaudeRunner, MockCodexRunner, mockFromConfig, MockGeminiRunner, mockInsertMessages, mockInsertSession, mockProvider, mockProviderRunAnalysis (+1 more)

### Community 64 - "Community 64"
Cohesion: 0.19
Nodes (8): getVersionDir(), loadArtifact(), saveArtifact(), saveMetadata(), saveScores(), TrainingExample, withTimeout(), TEST_DIR

### Community 65 - "Community 65"
Cohesion: 0.24
Nodes (9): getAllProviders, insertMessages, insertSessionWithProjectAndReturnIsNew, recalculateUsageStats, saveSyncState, syncState, createTestDb(), makeParsedMessage() (+1 more)

### Community 66 - "Community 66"
Cohesion: 0.32
Nodes (11): GEPARunnerConfig, buildStudentPrompt(), buildTeacherPrompt(), DEFAULT_TEMPLATE_CONFIG, escapeRegExp(), fillTemplate(), INSTRUCTION_INVARIANTS, ObjectiveFeedback (+3 more)

### Community 67 - "Community 67"
Cohesion: 0.27
Nodes (9): collectEventsFiles(), CopilotCliProvider, CopilotEvent, extractText(), filterByProject(), getCopilotHome(), parseCopilotSession(), parseTimestamp() (+1 more)

### Community 68 - "Community 68"
Cohesion: 0.23
Nodes (10): createInsightProgram(), scalarizeScores(), ParetoPoint, GEPARunnerResult, args, BUILTIN_SAMPLES, parseResponse(), runDiagnostics() (+2 more)

### Community 70 - "Community 70"
Cohesion: 0.23
Nodes (10): SearchInsightResult, SearchSessionResult, SearchHighlight(), SearchHighlightProps, formatRelativeDate(), INSIGHT_ICONS, InsightResultProps, InsightSearchResult() (+2 more)

### Community 71 - "Community 71"
Cohesion: 0.26
Nodes (8): collectJsonFiles(), CopilotProvider, CopilotRequest, CopilotResponseItem, CopilotSession, getVSCodeUserDir(), parseCopilotSession(), resolveWorkspacePath()

### Community 72 - "Community 72"
Cohesion: 0.18
Nodes (7): initTestDb(), MessageOverrides, mockChat, mockIsConfigured, SessionOverrides, VALID_ANALYSIS_RESPONSE, VALID_PQ_RESPONSE

### Community 74 - "Community 74"
Cohesion: 0.18
Nodes (4): initTestDb(), mockAnalyzePromptQuality, mockExtractFacetsOnly, mockIsLLMConfigured

### Community 77 - "Community 77"
Cohesion: 0.27
Nodes (6): DiscoveredModel, discoverModels(), discoverOllamaModels(), app, PROVIDER_API_KEY_ENV, VALID_PROVIDERS

### Community 78 - "Community 78"
Cohesion: 0.20
Nodes (6): initTestDb(), mockAnalyzePromptQuality, mockAnalyzeSession, mockFindRecurringInsights, mockIsLLMConfigured, mockLoadLLMConfig

### Community 79 - "Community 79"
Cohesion: 0.33
Nodes (8): CLI_ENTRY, readStdin(), sessionEndCommand(), SessionEndOptions, spawnWorker(), WORKER_LOG_PATH, enqueue(), getConfigDir()

### Community 81 - "Community 81"
Cohesion: 0.38
Nodes (8): getAllProviders(), getVersion(), printBanner(), purple, ensureConfigDir(), countAllSessions(), showWelcomeIfFirstRun(), touchWelcomeMarker()

### Community 82 - "Community 82"
Cohesion: 0.25
Nodes (7): Code Insights - Recent Insights, Instructions, Output Format, Recent Decisions, Recent Learnings, Recent Work Items, Usage

### Community 84 - "Community 84"
Cohesion: 0.25
Nodes (6): extractTopicsFromTranscript(), loadTrainingData(), runOptimize(), createGEPARunner(), runGEPAOptimization(), sampleData

### Community 87 - "Community 87"
Cohesion: 0.25
Nodes (4): initTestDb(), mockChat, mockIsLLMConfigured, mockLoadLLMConfig

### Community 88 - "Community 88"
Cohesion: 0.25
Nodes (6): ANALYSIS_FACETS_REQUIRED, ANALYSIS_RESPONSE_TOP_LEVEL_REQUIRED, DIMENSION_SCORES_REQUIRED, __dirname, PROMPT_QUALITY_RESPONSE_TOP_LEVEL_REQUIRED, schemasDir

### Community 92 - "Community 92"
Cohesion: 0.33
Nodes (5): initTestDb(), mockChat, mockIsLLMConfigured, seedMultipleSessions(), seedSessionWithFacets()

### Community 94 - "Community 94"
Cohesion: 0.40
Nodes (5): [3.3.0] - 2026-03-02, Added, Changed, Fixed, Removed

### Community 95 - "Community 95"
Cohesion: 0.40
Nodes (5): [4.0.0] - 2026-03-16, Added, Changed, Fixed, Improved

### Community 99 - "Community 99"
Cohesion: 0.50
Nodes (4): [2.0.0] - 2026-02-26, Added, Changed, Fixed

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
Cohesion: 0.50
Nodes (4): [4.5.0] - 2026-03-21, Added, Fixed, Improved

### Community 108 - "Community 108"
Cohesion: 0.83
Nodes (3): embed(), main(), vecToBlob()

### Community 109 - "Community 109"
Cohesion: 0.67
Nodes (3): [3.3.1] - 2026-03-02, Added, Fixed

### Community 110 - "Community 110"
Cohesion: 0.67
Nodes (3): [3.4.0] - 2026-03-02, Added, Fixed

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
Cohesion: 0.67
Nodes (3): [4.2.0] - 2026-03-19, Added, Fixed

### Community 115 - "Community 115"
Cohesion: 0.67
Nodes (3): [4.6.0] - 2026-03-22, Added, Changed

### Community 116 - "Community 116"
Cohesion: 0.67
Nodes (3): [4.7.0] - 2026-03-25, Added, Changed

## Knowledge Gaps
- **422 isolated node(s):** `args`, `verbose`, `sampleIdx`, `BUILTIN_SAMPLES`, `SESSION` (+417 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `parseJsonField()` connect `Community 13` to `Community 32`, `Community 35`, `Community 4`, `Community 7`, `Community 8`, `Community 10`, `Community 43`, `Community 54`, `Community 23`, `Community 57`?**
  _High betweenness centrality (0.281) - this node is a cross-community bridge._
- **Why does `loadConfig()` connect `Community 31` to `Community 1`, `Community 2`, `Community 34`, `Community 4`, `Community 42`, `Community 43`, `Community 46`, `Community 15`, `Community 19`, `Community 56`, `Community 58`?**
  _High betweenness centrality (0.185) - this node is a cross-community bridge._
- **Why does `getDb()` connect `Community 39` to `Community 33`, `Community 2`, `Community 40`, `Community 15`, `Community 79`, `Community 49`, `Community 18`, `Community 19`, `Community 84`, `Community 52`, `Community 58`, `Community 59`, `Community 28`, `Community 30`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `getDb()` (e.g. with `retrieveRelatedInsights()` and `findGroupsByVectorSimilarity()`) actually correct?**
  _`getDb()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `runMigrations()` (e.g. with `initTestDb()` and `initTestDb()`) actually correct?**
  _`runMigrations()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `args`, `verbose`, `sampleIdx` to the rest of the system?**
  _422 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.1492063492063492 - nodes in this community are weakly interconnected._