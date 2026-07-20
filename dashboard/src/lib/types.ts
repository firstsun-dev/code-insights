// Dashboard-specific types matching the Hono API response format.
// The server returns SQLite rows as-is — snake_case keys, ISO 8601 date strings.
// Convert to Date objects only at the component boundary when needed.

export type ExportTemplate = 'knowledge-base' | 'agent-rules';

export interface Project {
  id: string;
  name: string;
  path: string;
  git_remote_url: string | null;
  session_count: number;
  last_activity: string;        // ISO 8601
  created_at: string;           // ISO 8601
  updated_at: string;           // ISO 8601
  total_input_tokens?: number;
  total_output_tokens?: number;
  cache_creation_tokens?: number;
  cache_read_tokens?: number;
  estimated_cost_usd?: number;
}

// Home directories (multi-home-directory support). Deliberately camelCase — the
// server route returns the CLI's Home shape as-is (already camelCase from
// cli/src/db/homes.ts's rowToHome()) rather than raw snake_case SQLite columns.
export interface Home {
  id: string;
  label: string;
  path: string;
  enabled: boolean;
  createdAt: string; // ISO 8601
}

export type SessionCharacter =
  | 'deep_focus'
  | 'bug_hunt'
  | 'feature_build'
  | 'exploration'
  | 'refactor'
  | 'learning'
  | 'quick_task';

export type TitleSource = 'claude' | 'user_message' | 'insight' | 'character' | 'fallback';

export interface Session {
  id: string;
  project_id: string;
  project_name: string;
  project_path: string;
  git_remote_url: string | null;
  summary: string | null;
  custom_title: string | null;
  generated_title: string | null;
  title_source: TitleSource | null;
  session_character: SessionCharacter | null;
  started_at: string;           // ISO 8601
  ended_at: string;             // ISO 8601
  message_count: number;
  user_message_count: number;
  assistant_message_count: number;
  tool_call_count: number;
  git_branch: string | null;
  claude_version: string | null;
  source_tool: string | null;
  home_id: string | null;
  device_id: string | null;
  device_hostname: string | null;
  device_platform: string | null;
  synced_at: string;            // ISO 8601
  total_input_tokens: number | null;
  total_output_tokens: number | null;
  cache_creation_tokens: number | null;
  cache_read_tokens: number | null;
  estimated_cost_usd: number | null;
  models_used: string | null;   // JSON-encoded string[] — decode with parseJsonField<string[]>(x, [])
  primary_model: string | null;
  usage_source: string | null;
  compact_count: number;
  auto_compact_count: number;
  slash_commands: string | null; // JSON-encoded string[] — decode with parseJsonField<string[]>(x, [])
  facets?: {
    session_id: string;
    outcome_satisfaction: string;
    workflow_pattern: string | null;
    had_course_correction: number;
    course_correction_reason: string | null;
    iteration_count: number;
    friction_points: string;     // JSON string
    effective_patterns: string;  // JSON string
    extracted_at: string;
    analysis_version: string;
  } | null;
}

export type InsightType = 'summary' | 'decision' | 'learning' | 'technique' | 'prompt_quality';
export type InsightScope = 'session' | 'project' | 'overall';

// Personality Analysis Types
export interface PersonalityBigFiveTrait {
  score: number;
  level: 'low' | 'moderate' | 'high';
  evidence: string[];
}

export interface PersonalityBigFive {
  openness: PersonalityBigFiveTrait;
  conscientiousness: PersonalityBigFiveTrait;
  extraversion: PersonalityBigFiveTrait;
  agreeableness: PersonalityBigFiveTrait;
  neuroticism: PersonalityBigFiveTrait;
}

export interface PersonalityWorkStyle {
  planning_approach: 'structured' | 'balanced' | 'emergent';
  planning_description: string;
  problem_solving: 'analytical' | 'intuitive' | 'hybrid';
  problem_solving_description: string;
  risk_tolerance: 'conservative' | 'balanced' | 'experimental';
  risk_tolerance_description: string;
  pace_preference: 'deliberate' | 'balanced' | 'rapid';
  pace_description: string;
}

export interface PersonalityCommunicationPatterns {
  prompt_style: 'detailed' | 'balanced' | 'concise';
  prompt_style_description: string;
  information_gathering: 'comprehensive' | 'just_in_time' | 'balanced';
  information_gathering_description: string;
  feedback_processing: 'immediate' | 'reflective' | 'balanced';
  feedback_processing_description: string;
}

export interface PersonalityDecisionMaking {
  style: 'data_driven' | 'intuitive' | 'balanced';
  style_description: string;
  option_exploration: 'single_path' | 'multiple_alternatives' | 'balanced';
  option_exploration_description: string;
  reversibility_preference: 'commit_quickly' | 'keep_open' | 'balanced';
  reversibility_description: string;
}

export interface PersonalityStrength {
  strength: string;
  description: string;
  evidence: string;
}

export interface PersonalityGrowthArea {
  area: string;
  description: string;
  suggestion: string;
}

export interface PersonalityAICollaboration {
  preferred_role: 'co_pilot' | 'pair_programmer' | 'consultant' | 'tool' | 'mentor';
  preferred_role_description: string;
  delegation_comfort: 'hands_on' | 'balanced' | 'hands_off';
  trust_level: 'verify_heavily' | 'balanced' | 'trust_default';
  best_collaboration_mode: string;
}

export interface PersonalityProfile {
  section: 'personality-profile';
  big_five: PersonalityBigFive;
  work_style: PersonalityWorkStyle;
  communication_patterns: PersonalityCommunicationPatterns;
  decision_making: PersonalityDecisionMaking;
  strengths: PersonalityStrength[];
  growth_areas: PersonalityGrowthArea[];
  ai_collaboration: PersonalityAICollaboration;
  narrative_summary: string;
  characterDistribution?: Record<string, number>;
  workflowDistribution?: Record<string, number>;
  outcomeDistribution?: Record<string, number>;
  generatedAt: string;
}

export interface PersonalitySnapshot {
  period: string;
  projectId: string;
  profile: PersonalityProfile;
  generatedAt: string;
  windowStart: string | null;
  windowEnd: string;
  sessionCount: number;
  facetCount: number;
}

export interface Insight {
  id: string;
  session_id: string;
  project_id: string;
  project_name: string;
  type: InsightType;
  title: string;
  content: string;
  summary: string;
  bullets: string;              // JSON-encoded string[] — decode with parseJsonField<string[]>(x, [])
  confidence: number;
  source: 'llm';
  metadata: string;             // JSON-encoded Record<string,unknown> — decode with parseJsonField<T>(x, {})
  timestamp: string;            // ISO 8601
  created_at: string;           // ISO 8601
  scope: InsightScope;
  analysis_version: string;
  linked_insight_ids: string | null; // JSON-encoded string[] | null — decode with parseJsonField<string[]>(x, [])
}

export interface ToolCall {
  id: string;                   // tool_use_id from JSONL
  name: string;
  input: string;                // serialized JSON from CLI
}

export interface ToolResult {
  toolUseId: string;            // References ToolCall.id
  output: string;               // Truncated tool output
}

export interface Message {
  id: string;
  session_id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  thinking: string | null;
  tool_calls: string;           // JSON-encoded array from SQLite
  tool_results: string;         // JSON-encoded array from SQLite
  usage: string | null;         // JSON-encoded object from SQLite
  timestamp: string;            // ISO 8601
  parent_id: string | null;
}

// Daily stats from /api/analytics/usage
export interface DailyStats {
  date: string;
  session_count: number;
  message_count: number;
  insight_count: number;
  total_tokens?: number;
  estimated_cost_usd?: number;
}

/**
 * Safely parse a JSON-encoded string field from the SQLite API response.
 * Returns defaultValue if the field is null, empty, or invalid JSON.
 *
 * DECODE PATTERN for all JSON-encoded columns in this file:
 *   Always use parseJsonField<T>(field, defaultValue) — never bare JSON.parse().
 *   For array fields, pass [] as defaultValue and verify Array.isArray() at use site
 *   if the consumer calls array methods (.map, .filter, etc.), since parseJsonField
 *   trusts the type parameter and cannot verify shape at runtime.
 *
 * JSON-encoded columns in Session: models_used, slash_commands
 * JSON-encoded columns in Insight: bullets, metadata, linked_insight_ids
 */
export function parseJsonField<T>(value: string | null | undefined, defaultValue: T): T {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

// Dashboard stats from /api/analytics/dashboard
export interface DashboardStats {
  session_count: number;
  active_projects: number;
  total_messages: number | null;
  total_tool_calls: number | null;
  total_duration_min: number | null;
  total_input_tokens: number | null;
  total_output_tokens: number | null;
  cache_creation_tokens: number | null;
  cache_read_tokens: number | null;
  estimated_cost_usd: number | null;
}

/**
 * Typed metadata for insight rendering.
 * Mirrors cli/src/types.ts InsightMetadata — all fields optional since
 * sessions may not have all metadata populated.
 */
export interface InsightMetadata {
  // Decision fields
  situation?: string;
  choice?: string;
  reasoning?: string;
  alternatives?: Array<string | { option: string; rejected_because: string }>;
  trade_offs?: string;
  revisit_when?: string;
  evidence?: string[];
  // Learning fields
  symptom?: string;
  root_cause?: string;
  takeaway?: string;
  applies_when?: string;
  // Summary fields — narrative outcome from LLM summary extraction.
  // Distinct from session_facets.outcome_satisfaction ('high'|'medium'|'low'|'abandoned')
  // which is a quantitative satisfaction rating used on the Patterns page.
  outcome?: 'success' | 'partial' | 'abandoned' | 'blocked';
  // Legacy learning/technique
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
    sfl_breakdown?: {
      ideational: string;
      interpersonal: string;
      textual: string;
    };
  }>;
  findings?: Array<{
    category: string;
    type: 'deficit' | 'strength';
    description: string;
    message_ref: string;
    impact: 'high' | 'medium' | 'low';
    confidence: number;
    suggested_improvement?: string;
    sfl_breakdown?: {
      ideational: string;
      interpersonal: string;
      textual: string;
    };
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

// Raw session_facets row as returned by GET /api/facets
export interface FacetRow {
  session_id: string;
  outcome_satisfaction: string;
  workflow_pattern: string | null;
  had_course_correction: number;
  course_correction_reason: string | null;
  iteration_count: number;
  friction_points: string;     // JSON-encoded FrictionPoint[]
  effective_patterns: string;  // JSON-encoded EffectivePattern[]
  extracted_at: string;
  analysis_version: string;
}

export interface FrictionPoint {
  category: string;
  attribution?: 'user-actionable' | 'ai-capability' | 'environmental';
  description: string;
  severity: 'high' | 'medium' | 'low';
  resolution: 'resolved' | 'workaround' | 'unresolved';
}

export interface EffectivePattern {
  category: string;
  description: string;
  confidence: number;
  driver?: 'user-driven' | 'ai-driven' | 'collaborative';
}

// Prefill data for DispatchDrawer when opened from InsightsPage
export interface DispatchPrefill {
  sessionId: string;
  title: string;
  format: 'blog' | 'linkedin';
  contextMarkdown: string;
}

// ── Dispatch (LLM-powered post generation) ────────────────────────────────────

export type DispatchTone = 'technical' | 'accessible' | 'quick-tips';
export type DispatchFormat = 'blog' | 'linkedin';

export interface DispatchRequest {
  insightIds: string[];
  context: string;
  tone: DispatchTone;
  format: DispatchFormat;
  includeSessionBackground?: boolean;
}

export interface DispatchResponse {
  markdown: string;
  body: string;
  format: DispatchFormat;
  frontmatter: { title: string; tags: string[]; tldr: string };
  wordCount: number;
  characterCount: number;
  degraded: boolean;
  model: string;
  tokensUsed: { input: number; output: number };
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

// LLM config from /api/config/llm
export interface LLMConfig {
  dashboardPort: number;
  provider?: 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'llamacpp' | 'openai-compatible';
  model?: string;
  apiKey?: string;      // masked by server before returning (first4...last4)
  baseUrl?: string;
}

// Personality API types
export interface PersonalityWeekInfo {
  week: string;
  sessionCount: number;
  hasSnapshot: boolean;
  generatedAt: string | null;
}

export interface PersonalitySnapshotResponse {
  snapshot: PersonalitySnapshot | null;
}

export interface PersonalityWeeksResponse {
  weeks: PersonalityWeekInfo[];
}

export interface CacheBySourceRow {
  sourceTool: string | null;
  sessionCount: number;
  totalInputTokens: number | null;
  cacheCreationTokens: number | null;
  cacheReadTokens: number | null;
}
