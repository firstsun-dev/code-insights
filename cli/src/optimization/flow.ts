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

export const INSIGHT_OUTPUT_FORMAT = `Respond with valid JSON only, wrapped in <json>...</json> tags:
{
  "insights": [
    {
      "category": "kebab-case-category",
      "description": "One neutral sentence with specific details",
      "confidence": 85,
      "evidence": ["User#1: Quote", "Assistant#2: Quote"]
    }
  ],
  "quality": 0.85
}`;

// ── Ax program (optimizable) ─────────────────────────────────────────────────

/**
 * Create the insight generation program.
 * The instruction strings are marked as optimizable components via the
 * `description` field in the signature — GEPA will evolve these.
 *
 * Return type is inferred from ax() to avoid AxGenOut index signature
 * compatibility issues with the InsightOutput interface.
 */
export function createInsightProgram() {
  return ax(
    `sessionData:string -> insights:json, quality:number`,
    {
      description: INSIGHT_INSTRUCTION,
    }
  );
}
