// Core types for Code Insights

export interface ClaudeMessage {
  type: 'user' | 'assistant' | 'system';
  parentUuid?: string | null;
  uuid: string;
  sessionId: string;
  timestamp: string;
  cwd?: string;
  gitBranch?: string;
  version?: string;
  isSidechain?: boolean;
  isMeta?: boolean;
  message: {
    role: string;
    content: string | MessageContent[];
    model?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
}

export interface MessageContent {
  type: 'text' | 'thinking' | 'tool_use' | 'tool_result';
  text?: string;
  thinking?: string;
  // tool_use fields
  id?: string;                       // tool_use_id
  name?: string;
  input?: Record<string, unknown>;
  // tool_result fields
  tool_use_id?: string;              // references tool_use_id
  content?: string | Array<{ type: string; text: string }>;  // can be string or array
}

export interface SessionSummary {
  type: 'summary';
  summary: string;
  leafUuid: string;
}

export interface FileHistorySnapshot {
  type: 'file-history-snapshot';
  messageId: string;
  snapshot: {
    messageId: string;
    trackedFileBackups: Record<string, unknown>;
    timestamp: string;
  };
  isSnapshotUpdate: boolean;
}

export type JsonlEntry = ClaudeMessage | SessionSummary | FileHistorySnapshot;

export interface ParsedSession {
  id: string;
  projectPath: string;
  projectName: string;
  summary: string | null;
  // New fields for smart titles
  generatedTitle: string | null;
  titleSource: TitleSource | null;
  sessionCharacter: SessionCharacter | null;
  startedAt: Date;
  endedAt: Date;
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  toolCallCount: number;
  compactCount: number;
  autoCompactCount: number;
  slashCommands: string[];  // All non-exit slash commands used, e.g., ["/compact", "/login", "/plan"]
  customTitle?: string;
  gitBranch: string | null;
  claudeVersion: string | null;
  sourceTool?: string;
  parentSessionId?: string | null;  // For subagent sessions (e.g., Mistral Vibe nested agents)
  agentType?: string | null;        // Type of agent for subagent sessions
  usage?: SessionUsage;
  messages: ParsedMessage[];
}

export interface ParsedMessage {
  id: string;
  sessionId: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  thinking: string | null;           // extracted thinking content
  toolCalls: ToolCall[];
  toolResults: ToolResult[];         // extracted tool results
  usage: MessageUsage | null;        // per-message usage (assistant only)
  timestamp: Date;
  parentId: string | null;
}

export interface SessionUsage {
  totalInputTokens: number;
  totalOutputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  estimatedCostUsd: number;
  modelsUsed: string[];
  primaryModel: string;
  usageSource: 'jsonl' | 'session';
}

export type SessionCharacter =
  | 'deep_focus'    // 50+ messages, concentrated file work
  | 'bug_hunt'      // Error patterns + fixes
  | 'feature_build' // Multiple new files created
  | 'exploration'   // Heavy Read/Grep, few edits
  | 'refactor'      // Many edits, same file count
  | 'learning'      // Questions and explanations
  | 'quick_task';   // <10 messages, completed

export type TitleSource = 'claude' | 'user_message' | 'insight' | 'character' | 'fallback';

export interface TitleCandidate {
  text: string;
  source: TitleSource;
  score: number;
}

export interface GeneratedTitle {
  title: string;
  source: TitleSource;
  character: SessionCharacter | null;
}

export interface ParsedInsightContent {
  title: string;
  summary: string;
  bullets: string[];
  rawContent: string;
}

export interface ToolCall {
  id: string;                        // tool_use_id from JSONL
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  toolUseId: string;                 // References ToolCall.id
  output: string;                    // Truncated tool output
}

export interface MessageUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  model: string;
  estimatedCostUsd: number;
}

export type InsightType = 'summary' | 'decision' | 'learning' | 'technique' | 'prompt_quality';
export type InsightScope = 'session' | 'project' | 'overall';

export interface Insight {
  id: string;
  sessionId: string;
  projectId: string;
  projectName: string;
  type: InsightType;
  title: string;
  content: string;
  summary: string;
  bullets: string[];
  confidence: number;
  source: 'llm';
  metadata: InsightMetadata;
  timestamp: Date;
  createdAt?: Date;
  scope: InsightScope;
  analysisVersion: string;
}

export interface InsightMetadata {
  // Decision-specific (v3.0.0 decomposed schema)
  situation?: string;
  choice?: string;
  reasoning?: string;
  alternatives?: Array<string | { option: string; rejected_because: string }>;
  trade_offs?: string;
  revisit_when?: string;
  evidence?: string[];
  // Learning-specific (v3.0.0 decomposed schema)
  symptom?: string;
  root_cause?: string;
  takeaway?: string;
  applies_when?: string;
  // Summary-specific — narrative outcome from LLM summary extraction.
  // Distinct from session_facets.outcome_satisfaction ('high'|'medium'|'low'|'abandoned')
  // which is a quantitative satisfaction rating used for Patterns/Reflect aggregation.
  outcome?: 'success' | 'partial' | 'abandoned' | 'blocked';
  // Technique/learning-specific (legacy v2)
  context?: string;
  applicability?: string;
  // Prompt quality fields (new taxonomy — v3.x)
  efficiency_score?: number;
  message_overhead?: number;
  takeaways?: Array<{
    type: 'improve' | 'reinforce';
    category: string;
    label: string;
    message_ref: string;
    original?: string;
    better_prompt?: string;
    why?: string;
    what_worked?: string;
    why_effective?: string;
  }>;
  findings?: Array<{
    category: string;
    type: 'deficit' | 'strength';
    description: string;
    message_ref: string;
    impact: 'high' | 'medium' | 'low';
    confidence: number;
    suggested_improvement?: string;
  }>;
  dimension_scores?: {
    context_provision: number;
    request_specificity: number;
    scope_management: number;
    information_timing: number;
    correction_quality: number;
  };
  // Legacy prompt quality fields (pre-taxonomy — still in old insights)
  efficiencyScore?: number;
  wastedTurns?: Array<{ messageIndex: number; whatWentWrong?: string; reason?: string; originalMessage?: string; suggestedRewrite?: string; turnsWasted?: number }>;
  antiPatterns?: Array<{ name: string; description?: string; count: number; examples: string[]; fix?: string }>;
  sessionTraits?: Array<{ trait: string; severity: string; description: string; evidence?: string; suggestion?: string }>;
  potentialMessageReduction?: number;
}

// === Session Facets (cross-session analysis foundation) ===

export interface FrictionPoint {
  category: string;
  attribution?: 'user-actionable' | 'ai-capability' | 'environmental';
  description: string;
  severity: 'high' | 'medium' | 'low';
  resolution: 'resolved' | 'workaround' | 'unresolved';
}

export interface EffectivePattern {
  category: string;     // Required — no backward compat (Reflect feature not yet released)
  description: string;
  confidence: number;
  driver?: 'user-driven' | 'ai-driven' | 'collaborative';  // optional during transition — existing data without driver will not break
}

export type OutcomeSatisfaction = 'high' | 'medium' | 'low' | 'abandoned';

export interface SessionFacet {
  sessionId: string;
  outcomeSatisfaction: OutcomeSatisfaction;
  workflowPattern: string | null;
  hadCourseCorrection: boolean;
  courseCorrectionReason: string | null;
  iterationCount: number;
  frictionPoints: FrictionPoint[];
  effectivePatterns: EffectivePattern[];
  extractedAt: string;
  analysisVersion: string;
}

// === Reflect / Patterns types ===

export type ReflectSection = 'friction-wins' | 'rules-skills' | 'working-style';

export interface FrictionWinsResult {
  section: 'friction-wins';
  frictionCategories: Array<{
    category: string;
    count: number;
    avgSeverity: number;
    examples: string[];
    trend: 'increasing' | 'stable' | 'decreasing' | 'new';
  }>;
  effectivePatterns: Array<{
    category: string;
    label: string;
    frequency: number;
    avgConfidence: number;
    descriptions: string[];
  }>;
  narrative: string;
  generatedAt: string;
}

export interface RulesSkillsResult {
  section: 'rules-skills';
  claudeMdRules: Array<{
    rule: string;
    rationale: string;
    frictionSource: string;
  }>;
  /** @deprecated Removed in v3.7 — old snapshots may still contain this field */
  skillTemplates?: Array<{
    name: string;
    description: string;
    content: string;
  }>;
  hookConfigs: Array<{
    event: string;
    command: string;
    rationale: string;
  }>;
  targetTool: string;
  generatedAt: string;
}

export interface WorkingStyleResult {
  section: 'working-style';
  tagline?: string;             // 2-4 word archetype label (e.g. "The Methodical Builder")
  tagline_subtitle?: string;    // 1-sentence descriptor shown under the tagline on the share card (≤80 chars)
  narrative: string;
  workflowDistribution: Record<string, number>;
  outcomeDistribution: Record<string, number>;
  characterDistribution: Record<string, number>;
  generatedAt: string;
}

export type ReflectResult = FrictionWinsResult | RulesSkillsResult | WorkingStyleResult;

// === Personality Analysis types ===
// Standalone type — deliberately NOT a member of the ReflectResult union and NOT an
// extension of WorkingStyleResult. See docs/ARCHITECTURE.md / PR description for the
// architecture rationale: the reflect_snapshots write path does a full-blob overwrite
// per section, which would silently clobber a shared row if personality shared that table.

export type PersonalityTraitKey = 'precision' | 'resilience' | 'autonomy' | 'craft';

export interface PersonalityTrait {
  key: PersonalityTraitKey;
  score: number | null;      // 0-100 normalized; null = insufficient data
  band?: 'low' | 'moderate' | 'high';
  sampleSize: number;         // contributing facets/insights; 0 = insufficient data
}

export interface PersonalityBipolarAxis {
  key: 'explorer_executor';
  value: number | null;       // -100 (fully Explorer) .. +100 (fully Executor); null = insufficient data
  sampleSize: number;
}

export interface PersonalityPace {
  value: number | null;       // 0 = deliberate .. 100 = rapid
  sampleSize: number;
}

export interface PersonalityArchetype {   // LLM-generated prose only; entirely optional
  tagline?: string;           // <=40 chars
  tagline_subtitle?: string;  // <=80 chars — naming matches WorkingStyleResult.tagline_subtitle
  narrative: string;
  strengths: string[];
  growthAreas: string[];
}

// Jungian cognitive functions, one per effective-pattern category. See the
// EFFECTIVE_PATTERN_TO_FUNCTION mapping comment in cli/src/analysis/personality.ts for
// the deliberate judgment call behind which pattern category maps to which function.
export type CognitiveFunctionKey = 'ni' | 'ne' | 'si' | 'se' | 'ti' | 'te' | 'fi' | 'fe';

export interface CognitiveFunctionScore {
  key: CognitiveFunctionKey;
  score: number | null;      // 0-100, relative-frequency scoring (formula mode) or LLM-vote average (llm-vote mode); null = insufficient data
  band?: 'low' | 'moderate' | 'high';
  sampleSize: number;         // contributing effective-pattern instances; 0 = insufficient data
}

export type MBTIType =
  | 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP'
  | 'INFJ' | 'INFP' | 'ENFJ' | 'ENFP'
  | 'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ'
  | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP';

// LLM-authored ranked guess, deliberately NOT part of the deterministic scoring in
// cli/src/analysis/personality.ts. `likelihood` is an intentional exception to this
// feature's "the LLM never produces a number" rule (see file header there and
// PERSONALITY_SYSTEM_PROMPT in server/src/llm/reflect-prompts.ts) — the request this
// exists to serve IS a ranking, so the number is unavoidable. It expresses the LLM's
// own relative confidence across its 5 guesses, not a recomputation of any trait/
// function score. Always optional/absent until POST /generate has run once, same
// lifecycle as `archetype`.
export interface MBTICandidate {
  type: MBTIType;
  rank: number;         // 1 (most likely) .. 5, reassigned server-side from array order — never trusts the LLM's own rank field
  likelihood: number;    // 0-100, LLM-estimated relative confidence; clamped/rounded server-side
  reasoning: string;     // <=2 sentences, grounded in the given function/trait scores
}

export interface MBTIProfile {
  type: MBTIType | null;
  functionStack: CognitiveFunctionKey[] | null; // [dominant, auxiliary, tertiary, inferior]
  confidence: 'low' | 'moderate' | 'high' | null;
  topCandidates?: MBTICandidate[]; // LLM-ranked top-5 guesses with reasoning; absent until generated
}

export interface PersonalityProfile {
  profileVersion: 1 | 2;              // 2 adds cognitiveFunctions + mbti; 1 kept so old cached rows still type-check
  traits: PersonalityTrait[];        // precision, resilience, autonomy, craft
  axis: PersonalityBipolarAxis;      // explorer_executor
  pace: PersonalityPace;
  cognitiveFunctions: CognitiveFunctionScore[];  // all 8, stable order: ni, ne, si, se, ti, te, fi, fe
  /** Which method produced `cognitiveFunctions` (and therefore `mbti`). Absent on rows
   * persisted before this field existed — treat as 'formula', the only mode that existed
   * then. 'llm-vote' only ever comes from POST /generate. */
  cognitiveFunctionScoringMode?: 'formula' | 'llm-vote';
  mbti: MBTIProfile;
  archetype?: PersonalityArchetype;
  computedAt: string;                 // ISO 8601
  analysisVersion: string;            // rule-scoring formula version string, start at '1.0.0'
  sessionCount: number;
  facetCount: number;
  period: string;                     // ISO week string, e.g. '2026-W29'
  projectId: string;                  // '__all__' for global
}

export type LLMProvider = 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'openrouter' | 'mistral' | 'llamacpp' | 'openai-compatible';

export interface LLMProviderConfig {
  provider: LLMProvider;
  apiKey?: string;       // not required for Ollama
  model: string;
  baseUrl?: string;      // for Ollama or custom endpoints
  rateLimit?: {
    rpm: number;
  };
}

export interface ProviderModelOption {
  id: string;
  name: string;
  description?: string;
  inputCostPer1M?: number;
  outputCostPer1M?: number;
}

export interface ProviderInfo {
  id: LLMProvider;
  name: string;
  models: ProviderModelOption[];
  requiresApiKey: boolean;
  apiKeyLink?: string;
}

export interface ClaudeInsightConfig {
  sync: {
    claudeDir: string;
    excludeProjects: string[];
  };
  dashboard?: {
    port?: number;
    llm?: LLMProviderConfig;
    analysis?: {
      retrieval?: {
        enabled?: boolean;
        topK?: number;
        similarityThreshold?: number;
        sameProjectOnly?: boolean;
      };
      personality?: {
        /** How the 8 Jungian cognitive function scores are computed. 'formula' (default)
         * is the deterministic relative-frequency scoring in cli/src/analysis/personality.ts
         * (no LLM call, always available). 'llm-vote' calls the LLM llmVoteRounds times to
         * independently score all 8 functions and averages the results — see
         * scoreCognitiveFunctionsByLlmVote in server/src/llm/personality-vote.ts. Only takes
         * effect on POST /generate (which has LLM access); GET / always uses 'formula'. */
        cognitiveFunctionScoring?: 'formula' | 'llm-vote';
        /** Number of independent LLM scoring rounds to average when cognitiveFunctionScoring
         * is 'llm-vote'. Clamped to [1, 7]. Default 3. */
        llmVoteRounds?: number;
      };
    };
  };
  telemetry?: boolean;              // default true (opt-out)
}

export type ExportTemplate = 'knowledge-base' | 'agent-rules';

export interface SyncState {
  lastSync: string;
  files: Record<string, FileSyncState>;
}

export interface FileSyncState {
  lastModified: string;
  lastSyncedLine: number;
  sessionId: string;
  syncedSessionIds?: string[];  // For providers where 1 file = N sessions (e.g., Cursor SQLite)
}

// ── Dispatch feature (blog post generator) ───────────────────────────────────

export type DispatchTone = 'technical' | 'accessible' | 'quick-tips';
export type DispatchFormat = 'blog' | 'linkedin';

export interface DispatchInsight {
  id: string;
  type: string;
  summary: string;
  content: string;
  bullets: string[];
}

export interface SessionBackground {
  sessionId: string;
  title: string;
  sessionCharacter: string | null;
  summary: string;
}

export interface DispatchRequest {
  insightIds: string[];
  context: string;
  tone: DispatchTone;
  format: DispatchFormat;
  includeSessionBackground?: boolean;
}

export interface DispatchResponse {
  markdown: string;
  /** Plain text body without YAML frontmatter — use for LinkedIn copy and word/char count. */
  body: string;
  format: DispatchFormat;
  frontmatter: {
    title: string;
    tags: string[];
    tldr: string;
  };
  wordCount: number;
  characterCount: number;
  degraded: boolean;
  model: string;
  tokensUsed: {
    input: number;
    output: number;
  };
}

export interface DispatchImagePromptRequest {
  title: string;
  tags: string[];
  tldr: string;
  format: DispatchFormat;
}

export interface DispatchImagePromptResponse {
  prompt: string;
  model: string;
  tokensUsed: { input: number; output: number };
}

