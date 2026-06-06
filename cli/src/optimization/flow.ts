/**
 * AxFlow definition for insight generation optimization.
 *
 * Defines the optimizable program that GEPA will evolve:
 *   sessionData:string -> insights:json, quality:number
 *
 * The instruction strings in the signature are marked as optimizable components,
 * allowing GEPA's reflective mutation to evolve the analysis prompt.
 */

import { ax } from '@ax-llm/ax';

// ── Output types ──────────────────────────────────────────────────────────────

export interface InsightOutput {
  insights: Array<{
    category: string;
    description: string;
    confidence: number;
    evidence: string[];
  }>;
  quality: number;
}

// ── Optimizable instruction strings ──────────────────────────────────────────
// These are the components GEPA will evolve. They are defined as separate
// constants so they can be extracted, mutated, and re-applied.

export const INSIGHT_INSTRUCTION = `Extract structured insights from the provided AI coding session transcript.

Focus on:
1. Technical decisions made (architecture, tooling, approach)
2. Friction points encountered (blockers, confusion, errors)
3. Effective patterns discovered (workflows, techniques, gotchas)
4. Actionable learnings (transferable lessons)

Each insight MUST include:
- A kebab-case category (e.g., "architecture-decision", "debugging-pattern")
- A neutral, specific description with concrete references
- A confidence score (0-100)
- 1-3 evidence citations referencing turn labels (e.g., "User#5")

Filter out generic or trivial findings. Return empty arrays for categories with no valid findings.`;

// IMPORTANT: AxFlow's parser (vs() in @ax-llm/ax 22.0.2) scans for
// field-title prefixes ("Insights:", "Quality:") in the LLM response
// and JSON.parses the text between them. It does NOT understand
// <json>...</json> wrappers or a single JSON envelope containing
// both fields. If we return one JSON object, the entire parsed
// object lands in `prediction.insights` and the metric crashes.
export const INSIGHT_OUTPUT_FORMAT = `Respond with two labeled blocks. Use this exact format:

Insights: {"insights": [{"category":"kebab-case-category","description":"One neutral sentence with specific details","confidence":85,"evidence":["User#1: Quote"]}]}
Quality: 0.85

Rules:
- "Insights:" must be followed by a JSON object with an "insights" array.
- "Quality:" must be followed by a single number between 0 and 1.
- Each insight needs: category (kebab-case), description, confidence (0-100), evidence (1-3 turn citations like "User#1").
- Output ONLY the two blocks above, no extra prose.`;

// ── Ax program (optimizable) ─────────────────────────────────────────────────

/**
 * Create the insight generation program.
 *
 * The combined instruction (analysis + output format) is passed as the
 * `description` field — GEPA will evolve this string. The output format
 * MUST be concatenated with the analysis instruction here: the Ax
 * signature only carries a single `description` field, and the parser
 * (vs() in @ax-llm/ax 22.0.2) extracts fields by looking for
 * "Insights:" / "Quality:" prefixes in the LLM's response. If the
 * LLM isn't told to use those prefixes, the parser extracts nothing
 * and every metric scores 0.
 *
 * Return type is inferred from ax() to avoid AxGenOut index signature
 * compatibility issues with the InsightOutput interface.
 */
const COMBINED_INSTRUCTION = `${INSIGHT_INSTRUCTION}

${INSIGHT_OUTPUT_FORMAT}`;

export function createInsightProgram() {
  return ax(
    `sessionData:string -> insights:json, quality:number`,
    {
      description: COMBINED_INSTRUCTION,
    }
  );
}
