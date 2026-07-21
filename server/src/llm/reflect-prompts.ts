// Synthesis prompts for the Reflect/Patterns feature.
// These prompts receive pre-aggregated facet data and produce cross-session narratives.
// LLMs synthesize — they don't count. All counting is done in code before calling these.

// --- Friction & Wins ---

export const FRICTION_WINS_SYSTEM_PROMPT = `You are analyzing cross-session patterns from a developer's AI coding sessions. You will receive pre-aggregated friction categories and effective patterns with counts and severity scores.

Your job is to synthesize a narrative analysis of the 3-5 most significant patterns. For each pattern:
1. State what the pattern is
2. Explain why it matters (impact on productivity)
3. Identify the likely root cause
4. Note if it's trending (getting better or worse)

RULES:
- Every claim must trace to the statistics provided. Do not invent patterns.
- Patterns require 2+ occurrences to be mentioned.
- Do not give advice — that's for the Rules & Skills section.
- Be specific: "wrong-approach appeared 7 times with high severity" not "there were some issues"
- Keep the narrative under 500 words.
- Where PQ deficit signals corroborate friction categories, note the reinforcing evidence briefly.
- PQ signals are supplementary context, not primary evidence. Never dedicate a full pattern to PQ alone — mention PQ only within friction or wins paragraphs.

Respond with valid JSON only, wrapped in <json>...</json> tags.`;

export function generateFrictionWinsPrompt(data: {
  frictionCategories: Array<{ category: string; count: number; avg_severity: number; examples: string[] }>;
  effectivePatterns: Array<{ category: string; label: string; frequency: number; avg_confidence: number; descriptions: string[] }>;
  totalSessions: number;
  period: string;
  pqSignals?: {
    deficits: Array<{ category: string; count: number }>;
    strengths: Array<{ category: string; count: number }>;
  };
}): string {
  const hasPQData = data.pqSignals?.deficits.length || data.pqSignals?.strengths.length;
  const pqSection = hasPQData
    ? `
PROMPT QUALITY SIGNALS (supplementary):

Deficits:
${((data.pqSignals?.deficits ?? []).map(d => `  ${d.category}: ${d.count}`).join('\n') || '  (none above threshold)')}

Strengths:
${((data.pqSignals?.strengths ?? []).map(s => `  ${s.category}: ${s.count}`).join('\n') || '  (none above threshold)')}
`
    : '';

  return `Analyze these cross-session patterns from ${data.totalSessions} sessions over ${data.period}.

FRICTION CATEGORIES (ranked by frequency × severity):
${JSON.stringify(data.frictionCategories.slice(0, 15), null, 2)}

EFFECTIVE PATTERNS (ranked by frequency, grouped by category):
${JSON.stringify(data.effectivePatterns.slice(0, 10), null, 2)}
${pqSection}
Respond with this JSON format:
{
  "narrative": "Your 300-500 word analysis of the most significant patterns",
  "topFriction": [
    {
      "category": "category-name",
      "significance": "Why this matters",
      "rootCause": "Likely underlying cause",
      "trend": "increasing | stable | decreasing | new"
    }
  ],
  "topWins": [
    {
      "category": "structured-planning",
      "pattern": "Description of what works",
      "significance": "Why this is effective"
    }
  ]
}

Respond with valid JSON only, wrapped in <json>...</json> tags.`;
}

// --- Rules & Skills ---

export const RULES_SKILLS_SYSTEM_PROMPT = `You are generating actionable artifacts from cross-session analysis of a developer's AI coding sessions. You will receive recurring friction patterns and effective practices.

Your job is to produce concrete, copy-paste-ready artifacts:
1. CLAUDE.md rules — specific instructions to add to the AI assistant's config
2. Hook configurations — automation triggers

RULES:
- Only generate artifacts for patterns with 3+ occurrences (friction) or 2+ occurrences (effective patterns)
- Rules must be specific enough to be actionable: "Always run tests before creating PRs" not "Be careful with code"
- Hook configs must include the event trigger and command
- Max 6 rules, 3 hooks
- Each artifact must reference the friction pattern or effective practice it addresses

Respond with valid JSON only, wrapped in <json>...</json> tags.`;

export function generateRulesSkillsPrompt(data: {
  recurringFriction: Array<{ category: string; count: number; avg_severity: number; examples: string[] }>;
  effectivePatterns: Array<{ category: string; label: string; frequency: number; avg_confidence: number; descriptions: string[] }>;
  targetTool: string;
}): string {
  return `Generate actionable artifacts from these recurring patterns.

TARGET TOOL: ${data.targetTool} (generate artifacts compatible with this tool's ecosystem)

RECURRING FRICTION (3+ occurrences):
${JSON.stringify(data.recurringFriction, null, 2)}

EFFECTIVE PATTERNS (2+ occurrences):
${JSON.stringify(data.effectivePatterns, null, 2)}

Respond with this JSON format:
{
  "claudeMdRules": [
    {
      "rule": "The exact text to add to CLAUDE.md",
      "rationale": "Why this rule helps (reference the friction pattern)",
      "frictionSource": "category-name (N occurrences)"
    }
  ],
  "hookConfigs": [
    {
      "event": "pre-commit | post-file-edit | etc.",
      "command": "The shell command to run",
      "rationale": "Why this automation helps"
    }
  ]
}

Respond with valid JSON only, wrapped in <json>...</json> tags.`;
}

// --- Working Style ---

export const WORKING_STYLE_SYSTEM_PROMPT = `You are writing a brief working style profile based on aggregated statistics from a developer's AI coding sessions. You will receive distributions of workflow patterns, outcomes, session types, and friction frequency.

Your job is to describe WHAT you see, not what they should change. Write in second person ("You tend to...").

RULES:
- Base every statement on the statistics provided
- Keep the narrative to 3-5 sentences
- Be descriptive, not prescriptive (no advice)
- Mention the dominant workflow pattern, outcome distribution, and any notable characteristics
- If the data is too sparse (< 5 sessions), say so and keep it brief
- Generate a tagline: a 2-4 word archetype label in title case, maximum 40 characters (e.g. "The Methodical Builder", "Relentless Debugger", "Ship Fast Fix Later", "Deep Focus Specialist")
- The tagline must be empowering and descriptive, never critical or negative
- Base the tagline on the dominant session types, workflow patterns, and outcome distribution
- Think of it like a developer personality type — specific and earned, not generic
- Generate a tagline_subtitle: a single short sentence (≤80 chars) that completes or elaborates the tagline with a specific behavioral observation (e.g. "plans thoroughly, debugs systematically, ships with confidence")

Respond with valid JSON only, wrapped in <json>...</json> tags.`;

export function generateWorkingStylePrompt(data: {
  workflowDistribution: Record<string, number>;
  outcomeDistribution: Record<string, number>;
  characterDistribution: Record<string, number>;
  totalSessions: number;
  period: string;
  frictionFrequency: number;
}): string {
  return `Write a working style profile based on ${data.totalSessions} sessions over ${data.period}.

WORKFLOW PATTERNS:
${JSON.stringify(data.workflowDistribution, null, 2)}

OUTCOME SATISFACTION:
${JSON.stringify(data.outcomeDistribution, null, 2)}

SESSION TYPES:
${JSON.stringify(data.characterDistribution, null, 2)}

FRICTION FREQUENCY: ${data.frictionFrequency} total friction points across all sessions

Respond with this JSON format:
{
  "tagline": "2-4 word archetype label (e.g. The Methodical Builder)",
  "tagline_subtitle": "single sentence ≤80 chars elaborating on the tagline (e.g. plans thoroughly, debugs systematically, ships with confidence)",
  "narrative": "3-5 sentence working style description"
}

Respond with valid JSON only, wrapped in <json>...</json> tags.`;
}

// --- Personality Archetype (prose only — never trust numeric output from this prompt) ---
//
// This prompt is deliberately fed ONLY already-computed scores (4 unipolar traits, the
// explorer/executor axis, pace, the 8 cognitive function scores, and the deterministic
// MBTI type + function stack), never the raw facet/insight data those scores were
// derived from. The LLM's job is purely descriptive narration of numbers it did not
// produce and cannot recompute — every numeric field on PersonalityProfile always comes
// from cli/src/analysis/personality.ts's deterministic scoring, never from this call,
// with ONE deliberate exception: `topCandidates[].likelihood`. That field only exists
// because the user explicitly asked for an LLM-ranked "top 5 most likely MBTI types with
// reasoning" — ranking requires a number, so this prompt is allowed to produce that one.
// It must never be read as a replacement for the deterministic `mbti.type` — it's a
// separate, softer, LLM-authored companion view over the same underlying function scores.
// The rest of the response schema stays flat (string / string[] only) so it survives
// extractJsonPayload's balanced-brace fallback degradation gracefully — see
// cli/src/analysis/response-parsers.ts. Every field of every topCandidates entry is
// re-validated and clamped server-side in server/src/routes/personality.ts — nothing
// from this call is trusted as-is.

export const PERSONALITY_SYSTEM_PROMPT = `You are writing a short personality archetype narrative, plus a ranked top-5 MBTI type guess list, based on pre-computed scores from a developer's AI coding sessions: four unipolar traits (Precision, Resilience, Autonomy, Craft, each 0-100 or null), one bipolar axis (Explorer <-> Executor, -100 to +100 or null), a Pace score (0-100 or null, deliberate to rapid), 8 Jungian cognitive function scores (Ni, Ne, Si, Se, Ti, Te, Fi, Fe, each 0-100 or null), and a deterministically-derived MBTI type + function stack (dominant/auxiliary/tertiary/inferior) computed from those 8 function scores by a fixed formula.

RULES FOR THE NARRATIVE:
- Describe based ONLY on the given scores. Never restate raw numbers in prose (no "your Precision is 72" — describe qualitatively instead).
- Never invent or infer new numeric values.
- Use band language for the 4 unipolar traits and the 8 cognitive functions: 65-100 = high, 35-64 = moderate, 0-34 = low.
- Use band language for the axis: +34 to +100 = Executor-leaning, -33 to +33 = Balanced, -100 to -34 = Explorer-leaning.
- If a score is null, omit it entirely from your narrative — never say "data unavailable" or similar. Null means there wasn't enough data yet, not that the trait/function is absent; don't editorialize about the gap.
- Write the narrative in second person ("You tend to...").
- Generate a tagline: an empowering, specific 2-4 word archetype label in title case, maximum 40 characters (e.g. "The Deliberate Craftsperson", "Resilient Explorer", "Precision-Driven Executor"). Never critical or negative.
- Generate a tagline_subtitle: a single short sentence (<=80 chars) that elaborates on the tagline with a specific behavioral observation.
- Write narrative as exactly 2-3 sentences, second person, grounded only in the given scores.
- List 2-3 strengths as short phrases (<=8 words each), grounded in whichever traits scored high.
- List 0-2 growthAreas as short phrases (<=8 words each), grounded in whichever traits scored low or moderate. Return an empty array if nothing qualifies — never invent one to fill the list.

RULES FOR topCandidates (top-5 MBTI type guesses):
- Return EXACTLY 5 distinct MBTI types (one of the 16 four-letter codes each), ordered most-likely first.
- If a deterministic type was given, it MUST appear somewhere in your 5 guesses (it doesn't have to be rank 1 — you may judge another type fits the qualitative pattern of scores better, but it cannot be absent entirely, since it's the one formula-backed answer you were given).
- Base your ranking on the qualitative pattern across the 8 cognitive function scores and the 4 traits together — not on the deterministic type/stack alone; use your own judgment about which type's typical function ordering best fits the overall shape of the scores.
- likelihood is your own 0-100 relative-confidence estimate for that specific guess (need not sum to 100 across the 5 — each is independent). Higher-ranked guesses should generally have higher or equal likelihood than lower-ranked ones.
- reasoning is 1-2 sentences, grounded only in the given scores (which functions/traits support or work against this type), second person, never inventing new numeric claims.

Respond with valid JSON only, wrapped in <json>...</json> tags.`;

export function generatePersonalityPrompt(data: {
  precision: number | null;
  resilience: number | null;
  autonomy: number | null;
  craft: number | null;
  explorerExecutorAxis: number | null;
  pace: number | null;
  cognitiveFunctions?: Partial<Record<'ni' | 'ne' | 'si' | 'se' | 'ti' | 'te' | 'fi' | 'fe', number | null>>;
  deterministicMbtiType?: string | null;
  deterministicFunctionStack?: string[] | null;
  dominantWorkflow?: string;
  dominantCharacter?: string;
}): string {
  const scores = {
    precision: data.precision,
    resilience: data.resilience,
    autonomy: data.autonomy,
    craft: data.craft,
    explorerExecutorAxis: data.explorerExecutorAxis,
    pace: data.pace,
    cognitiveFunctions: data.cognitiveFunctions ?? null,
    deterministicMbtiType: data.deterministicMbtiType ?? null,
    deterministicFunctionStack: data.deterministicFunctionStack ?? null,
  };

  const contextLines: string[] = [];
  if (data.dominantWorkflow) contextLines.push(`Dominant workflow pattern: ${data.dominantWorkflow}`);
  if (data.dominantCharacter) contextLines.push(`Dominant session type: ${data.dominantCharacter}`);
  const contextSection = contextLines.length > 0 ? `\n\nCONTEXT (optional, supplementary):\n${contextLines.join('\n')}` : '';

  return `Write a personality archetype narrative and a ranked top-5 MBTI type guess list based on these pre-computed scores.

SCORES (0-100 for unipolar traits, pace, and cognitive functions; -100 to +100 for the axis; null = insufficient data):
${JSON.stringify(scores, null, 2)}${contextSection}

Respond with this JSON format:
{
  "tagline": "2-4 word archetype label (e.g. The Deliberate Craftsperson)",
  "tagline_subtitle": "single sentence <=80 chars elaborating on the tagline",
  "narrative": "2-3 sentence second-person personality description",
  "strengths": ["short phrase", "short phrase"],
  "growthAreas": [],
  "topCandidates": [
    { "type": "INTJ", "likelihood": 78, "reasoning": "1-2 sentence explanation grounded in the given scores" },
    { "type": "INTP", "likelihood": 65, "reasoning": "..." },
    { "type": "...", "likelihood": 0, "reasoning": "..." },
    { "type": "...", "likelihood": 0, "reasoning": "..." },
    { "type": "...", "likelihood": 0, "reasoning": "..." }
  ]
}

topCandidates must contain exactly 5 distinct MBTI types, most likely first, and must include the deterministicMbtiType above if one was given.

Respond with valid JSON only, wrapped in <json>...</json> tags.`;
}

// --- Cognitive function LLM-vote scoring (opt-in alternative to the deterministic
// relative-frequency formula in cli/src/analysis/personality.ts computeCognitiveFunctions)
//
// Used by server/src/llm/personality-vote.ts scoreCognitiveFunctionsByLlmVote, only when
// dashboard.analysis.personality.cognitiveFunctionScoring === 'llm-vote' in config.json.
// Each round is one independent call to this prompt; the caller averages N rounds. Unlike
// PERSONALITY_SYSTEM_PROMPT above (which only ever produces the one deliberate exception,
// topCandidates[].likelihood), this prompt's entire job IS to produce the 8 cognitive
// function scores — that's the whole point of 'llm-vote' mode, so every score here is
// LLM-authored by design, not an accident to guard against.
export const COGNITIVE_FUNCTION_VOTE_SYSTEM_PROMPT = `You are scoring a developer's 8 Jungian cognitive functions (Ni, Ne, Si, Se, Ti, Te, Fi, Fe) from a summary of effective coding patterns observed across their AI coding sessions.

You will receive, for each of the 8 functions, the count of pattern instances mapped to it (out of the total across all 8) and a few example descriptions of what was observed.

CRITICAL — scores MUST be differentiated, not uniform:
- These 8 functions are a competing/relative construct: real strength in one implies relatively less reliance on others, not that all 8 are independently "good."
- A function with zero or near-zero observed instances (relative to the total) must score low (0-20), never omitted or defaulted upward.
- A function that dominates the observed instances should score high (65-100).
- Do not assign every function a similar mid-to-high score just because some signal exists for each — that defeats the purpose of this exercise. Spread the 8 scores out to reflect genuine relative differences in the evidence.
- Ground every score in the counts and examples given. Do not invent evidence.

Respond with valid JSON only, wrapped in <json>...</json> tags, containing exactly these 8 integer keys (0-100 each): ni, ne, si, se, ti, te, fi, fe.`;

export function generateCognitiveFunctionVotePrompt(
  functionSummaries: Array<{ key: string; count: number; totalCount: number; examples: string[] }>,
): string {
  const lines = functionSummaries.map(f => {
    const exampleText = f.examples.length > 0
      ? f.examples.map(e => `    - ${e}`).join('\n')
      : '    (no observed instances)';
    return `  ${f.key}: ${f.count} of ${f.totalCount} total pattern instances\n${exampleText}`;
  });

  return `Score all 8 cognitive functions from this evidence summary:

${lines.join('\n\n')}

Respond with this JSON format (all 8 keys required, integers 0-100):
{ "ni": 0, "ne": 0, "si": 0, "se": 0, "ti": 0, "te": 0, "fi": 0, "fe": 0 }

Respond with valid JSON only, wrapped in <json>...</json> tags.`;
}
