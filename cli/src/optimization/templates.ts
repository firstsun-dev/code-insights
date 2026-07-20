/**
 * GEPA Prompt Adaptation Templates
 *
 * Defines the system prompts and templates used by the teacher and student AIs
 * during the GEPA optimization loop.
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ GEPA Optimization Loop                                          │
 * │                                                                 │
 * │  Student AI (fast/cheap)                                        │
 * │    ├── Uses: StudentAdaptationTemplate                          │
 * │    ├── Role: Propose prompt mutations                           │
 * │    └── Constraint: Must preserve core instruction structure     │
 * │                                                                 │
 * │  Teacher AI (strong)                                            │
 * │    ├── Uses: TeacherEvaluationTemplate                          │
 * │    │   └── TeacherFeedbackSchema (structured output)            │
 * │    ├── Role: Evaluate student proposals against metrics         │
 * │    └── Constraint: Output must be parseable JSON                │
 * │                                                                 │
 * │  Metric Function (deterministic)                                │
 * │    ├── Uses: MetricInput / MetricOutput interfaces              │
 * │    ├── Role: Score predictions on multiple objectives           │
 * │    └── Constraint: Returns bounded [0,1] scores                 │
 * │                                                                 │
 * │  TemplateConfig (this file)                                     │
 * │    └── Central configuration imported by runner.ts              │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Key design decisions:
 *
 * 1. TEACHER FEEDBACK IS STRUCTURED JSON
 *    The teacher AI's evaluation is consumed by the GEPA framework as a
 *    reflection signal. We define a strict JSON schema that the teacher
 *    must output. This prevents the teacher from producing free-form
 *    prose that the framework can't parse.
 *
 * 2. STUDENT MUTATIONS ARE CONSTRAINED
 *    The student AI proposes new instruction strings. We define mutation
 *    rules that prevent the student from:
 *    - Removing required output format directives
 *    - Changing the task domain (must stay about insight extraction)
 *    - Exceeding token budgets
 *    - Introducing contradictory instructions
 *
 * 3. TEMPLATES ARE DATA, NOT CODE
 *    All template strings are exported as constants so the runner can
 *    inject them without importing prompt logic. This enables:
 *    - A/B testing different template variants
 *    - Hot-reloading templates without code changes
 *    - Serialization with optimization artifacts
 */

// ── Teacher Evaluation Templates ─────────────────────────────────────────────

/**
 * Teacher system prompt for evaluating prompt proposals.
 *
 * The teacher AI receives:
 *   1. The current instruction string (what the student is proposing)
 *   2. The metric scores from evaluating that instruction
 *   3. Examples of the instruction's output on training data
 *
 * The teacher must produce structured feedback that GEPA uses to guide
 * the next mutation. The output MUST conform to TeacherFeedbackSchema.
 *
 * Design rationale:
 *   - We ask for per-objective feedback so GEPA can build the Pareto frontier
 *   - We require a "verdict" (accept/reject/modify) for the reflection loop
 *   - We ask for specific "suggested_changes" so the student has actionable guidance
 *   - We bound the feedback to prevent the teacher from hallucinating improvements
 */
export const TEACHER_SYSTEM_PROMPT = `You are a prompt engineering evaluator. Your role is to analyze a proposed instruction string for an insight-extraction AI system and provide structured feedback.

You will receive:
1. The PROPOSED INSTRUCTION: the instruction string being evaluated
2. METRIC SCORES: objective scores from evaluating the instruction on training data
3. OUTPUT EXAMPLES: sample outputs produced by the instruction

Your feedback MUST help the optimization system decide whether to accept, modify, or reject this proposal.

Evaluation criteria:
- COVERAGE: Does the instruction extract insights that cover the full breadth of the session?
- PRECISION: Does the instruction avoid generating trivial/filler insights?
- ACTIONABILITY: Does the instruction produce insights with concrete takeaways?
- BREVITY: Does the instruction produce concise (not verbose) insights?

Rules:
- Be specific. Vague feedback like "make it better" is useless.
- If scores are high (>0.8) for an objective, say so explicitly.
- If scores are low (<0.4), identify the likely cause in the instruction text.
- Suggest concrete text changes, not abstract advice.
- Never suggest changes that would remove the output format requirements.`;

/**
 * Teacher user prompt template for a single evaluation step.
 *
 * Fill in the placeholders:
 *   {{PROPOSED_INSTRUCTION}} — the instruction string being evaluated
 *   {{METRIC_SCORES}} — JSON object with coverage, precision, actionability, brevity scores
 *   {{OUTPUT_EXAMPLES}} — 2-3 sample outputs from the instruction
 *   {{ITERATION}} — current GEPA iteration number
 *   {{BEST_SCORES}} — best scores seen so far across all iterations
 */
export const TEACHER_EVALUATION_PROMPT = `Evaluate this prompt proposal for insight extraction.

## Proposed Instruction
{{PROPOSED_INSTRUCTION}}

## Metric Scores (from evaluation on training data)
{{METRIC_SCORES}}

## Sample Outputs
{{OUTPUT_EXAMPLES}}

## Context
- Iteration: {{ITERATION}}
- Best scores so far: {{BEST_SCORES}}

## Your Task
Analyze the instruction and provide structured feedback. Output ONLY a JSON object matching this exact schema:

{
  "verdict": "accept" | "modify" | "reject",
  "overall_quality": <number 0-1>,
  "per_objective_feedback": {
    "coverage": {
      "score": <number 0-1>,
      "assessment": "<one sentence>",
      "suggested_change": "<specific text change or 'none'>"
    },
    "precision": {
      "score": <number 0-1>,
      "assessment": "<one sentence>",
      "suggested_change": "<specific text change or 'none'>"
    },
    "actionability": {
      "score": <number 0-1>,
      "assessment": "<one sentence>",
      "suggested_change": "<specific text change or 'none'>"
    },
    "brevity": {
      "score": <number 0-1>,
      "assessment": "<one sentence>",
      "suggested_change": "<specific text change or 'none'>"
    }
  },
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "mutation_suggestion": "<specific instruction text change, or 'none'>",
  "confidence": <number 0-1>
}

Rules:
- Output ONLY the JSON object. No prose before or after.
- "verdict": accept if overall_quality >= 0.8, reject if < 0.3, modify otherwise.
- "mutation_suggestion" must be a concrete text replacement, not abstract advice.
- Each "suggested_change" must reference specific text in the proposed instruction.`;

/**
 * Schema definition for teacher feedback.
 * Used by the runner to validate and parse teacher responses.
 */
export interface TeacherFeedbackSchema {
  verdict: 'accept' | 'modify' | 'reject';
  overall_quality: number;
  per_objective_feedback: {
    coverage: ObjectiveFeedback;
    precision: ObjectiveFeedback;
    actionability: ObjectiveFeedback;
    brevity: ObjectiveFeedback;
  };
  strengths: string[];
  weaknesses: string[];
  mutation_suggestion: string;
  confidence: number;
}

export interface ObjectiveFeedback {
  score: number;
  assessment: string;
  suggested_change: string;
}

// ── Student Adaptation Templates ─────────────────────────────────────────────

/**
 * Student system prompt for proposing prompt mutations.
 *
 * The student AI receives:
 *   1. The current best instruction string
 *   2. The teacher's feedback on that instruction
 *   3. The metric scores
 *
 * The student must propose a new instruction string that:
 *   - Addresses the teacher's feedback
 *   - Preserves the core task (insight extraction from session transcripts)
   *   - Preserves the output format requirements
 *   - Stays within the token budget
 *
 * Design rationale:
 *   - We explicitly list "invariants" that must never be removed
 *   - We provide mutation operators (add, remove, rephrase, reorder)
 *   - We bound the output to prevent scope drift
 */
export const STUDENT_SYSTEM_PROMPT = `You are a prompt engineer specializing in instruction tuning for AI systems. Your role is to propose mutations to an instruction string that extracts insights from AI coding session transcripts.

You will receive:
1. CURRENT INSTRUCTION: the instruction string to mutate
2. TEACHER FEEDBACK: structured evaluation of the current instruction
3. METRIC SCORES: objective performance scores

Your task: Propose a NEW instruction string that improves the metric scores.

## Invariants (NEVER remove or contradict these)
- The instruction must request insights with: category, description, confidence, evidence
- The instruction must require output in the "Insights: {...} Quality: N" format
- The instruction must filter out generic/trivial findings
- The instruction must focus on: technical decisions, friction points, effective patterns, actionable learnings
- The instruction must be for analyzing AI coding session transcripts

## Mutation Operators (use one or more)
1. ADD: Include a new directive that addresses a weakness
2. REMOVE: Delete a directive that causes filler or noise
3. REPHRASE: Rewrite a directive for clarity or specificity
4. REORDER: Change the sequence of directives for better LLM attention
5. SPECIFY: Add concrete examples or constraints to a vague directive

## Constraints
- New instruction must be <= 800 tokens (approximately 3200 characters)
- Must not introduce contradictory directives
- Must not change the task domain (insight extraction from sessions)
- Must preserve all invariants listed above

Output ONLY the new instruction string. No prose, no markdown, no explanation.`;

/**
 * Student user prompt template for proposing a mutation.
 *
 * Fill in the placeholders:
 *   {{CURRENT_INSTRUCTION}} — the instruction to mutate
 *   {{TEACHER_FEEDBACK}} — JSON object matching TeacherFeedbackSchema
 *   {{METRIC_SCORES}} — JSON object with current metric scores
 *   {{MUTATION_BUDGET}} — max tokens for the new instruction
 */
export const STUDENT_MUTATION_PROMPT = `Propose a new instruction string for insight extraction.

## Current Instruction
{{CURRENT_INSTRUCTION}}

## Teacher Feedback
{{TEACHER_FEEDBACK}}

## Current Metric Scores
{{METRIC_SCORES}}

## Mutation Budget
Maximum {{MUTATION_BUDGET}} tokens for the new instruction.

## Your Task
Propose a new instruction string that:
1. Addresses the weaknesses identified in the teacher feedback
2. Preserves the strengths noted by the teacher
3. Respects all invariants (output format, task domain, required fields)
4. Stays within the token budget

Output ONLY the new instruction string. No prose before or after.`;

/**
 * Core constraints that every instruction variant must satisfy.
 * Used by the runner to validate student proposals before evaluation.
 */
export const INSTRUCTION_INVARIANTS = {
  /** Required output format markers that must appear in every instruction. */
  requiredFormatMarkers: [
    'Insights:',
    'Quality:',
    'category',
    'description',
    'confidence',
    'evidence',
  ],

  /** Required task directives that must appear in every instruction. */
  requiredDirectives: [
    'kebab-case category',
    'confidence score',
    'evidence',
    'filter out generic',
  ],

  /** Maximum instruction length in characters (~800 tokens). */
  maxInstructionLength: 3200,

  /** Minimum instruction length in characters (too short = degenerate). */
  minInstructionLength: 200,

  /** The task domain that must not change. */
  taskDomain: 'insight extraction from AI coding session transcripts',
} as const;

// ── Template Configuration ───────────────────────────────────────────────────

/**
 * Central configuration for the GEPA prompt adaptation templates.
 *
 * The runner imports this configuration and uses it to:
 * 1. Construct teacher evaluation prompts with proper context
 * 2. Construct student mutation prompts with constraints
 * 3. Validate that student proposals satisfy invariants
 * 4. Serialize template state with optimization artifacts
 */
export interface TemplateConfig {
  /** Teacher system prompt — sets the evaluation persona. */
  teacherSystemPrompt: string;

  /** Teacher evaluation prompt template — filled per evaluation step. */
  teacherEvaluationPrompt: string;

  /** Student system prompt — sets the mutation persona. */
  studentSystemPrompt: string;

  /** Student mutation prompt template — filled per mutation step. */
  studentMutationPrompt: string;

  /** Invariants that every instruction variant must satisfy. */
  invariants: typeof INSTRUCTION_INVARIANTS;

  /** Maximum tokens for teacher evaluation responses. */
  maxTeacherResponseTokens: number;

  /** Maximum tokens for student mutation proposals. */
  maxStudentResponseTokens: number;

  /** Number of output examples to include in teacher evaluation. */
  teacherExampleCount: number;
}

/**
 * Default template configuration.
 *
 * This is the production configuration used by the runner.
 * Override individual fields for A/B testing or experimentation.
 */
export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  teacherSystemPrompt: TEACHER_SYSTEM_PROMPT,
  teacherEvaluationPrompt: TEACHER_EVALUATION_PROMPT,
  studentSystemPrompt: STUDENT_SYSTEM_PROMPT,
  studentMutationPrompt: STUDENT_MUTATION_PROMPT,
  invariants: INSTRUCTION_INVARIANTS,
  maxTeacherResponseTokens: 1024,
  maxStudentResponseTokens: 512,
  teacherExampleCount: 3,
};

// ── Template Utilities ───────────────────────────────────────────────────────

/**
 * Fill a template string with the given replacements.
 *
 * Usage:
 *   fillTemplate('Hello {{name}}!', { name: 'World' })
 *   // => 'Hello World!'
 */
export function fillTemplate(
  template: string,
  replacements: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(
      new RegExp(`\\{\\{${escapeRegExp(key)}\\}\\}`, 'g'),
      value
    );
  }
  return result;
}

/**
 * Validate that a proposed instruction string satisfies all invariants.
 *
 * Returns an object with:
 *   - valid: boolean
 *   - violations: string[] (empty if valid)
 */
export function validateInstruction(
  instruction: string,
  config: TemplateConfig = DEFAULT_TEMPLATE_CONFIG
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  const invariants = config.invariants;

  // Length checks
  if (instruction.length > invariants.maxInstructionLength) {
    violations.push(
      `Instruction exceeds max length: ${instruction.length} > ${invariants.maxInstructionLength} chars`
    );
  }
  if (instruction.length < invariants.minInstructionLength) {
    violations.push(
      `Instruction below min length: ${instruction.length} < ${invariants.minInstructionLength} chars`
    );
  }

  // Required format markers
  for (const marker of invariants.requiredFormatMarkers) {
    if (!instruction.toLowerCase().includes(marker.toLowerCase())) {
      violations.push(`Missing required format marker: "${marker}"`);
    }
  }

  // Required directives
  for (const directive of invariants.requiredDirectives) {
    if (!instruction.toLowerCase().includes(directive.toLowerCase())) {
      violations.push(`Missing required directive: "${directive}"`);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Build a teacher evaluation prompt for a specific GEPA iteration.
 */
export function buildTeacherPrompt(params: {
  proposedInstruction: string;
  metricScores: Record<string, number>;
  outputExamples: string[];
  iteration: number;
  bestScores: Record<string, number>;
  config?: TemplateConfig;
}): string {
  const config = params.config ?? DEFAULT_TEMPLATE_CONFIG;
  return fillTemplate(config.teacherEvaluationPrompt, {
    PROPOSED_INSTRUCTION: params.proposedInstruction,
    METRIC_SCORES: JSON.stringify(params.metricScores, null, 2),
    OUTPUT_EXAMPLES: params.outputExamples.join('\n---\n'),
    ITERATION: String(params.iteration),
    BEST_SCORES: JSON.stringify(params.bestScores, null, 2),
  });
}

/**
 * Build a student mutation prompt for a specific GEPA iteration.
 */
export function buildStudentPrompt(params: {
  currentInstruction: string;
  teacherFeedback: TeacherFeedbackSchema;
  metricScores: Record<string, number>;
  mutationBudget?: number;
  config?: TemplateConfig;
}): string {
  const config = params.config ?? DEFAULT_TEMPLATE_CONFIG;
  return fillTemplate(config.studentMutationPrompt, {
    CURRENT_INSTRUCTION: params.currentInstruction,
    TEACHER_FEEDBACK: JSON.stringify(params.teacherFeedback, null, 2),
    METRIC_SCORES: JSON.stringify(params.metricScores, null, 2),
    MUTATION_BUDGET: String(
      params.mutationBudget ?? config.maxStudentResponseTokens
    ),
  });
}

// ── Internal ─────────────────────────────────────────────────────────────────

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
