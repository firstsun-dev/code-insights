/**
 * AxFlow definition for insight generation optimization.
 *
 * Defines the optimizable program that GEPA will evolve:
 *   sessionData:string -> insights:json, quality:number
 *
 * The instruction strings in the signature are marked as optimizable components,
 * allowing GEPA's reflective mutation to evolve the analysis prompt.
 */

import { ax, type AxOptimizableComponent } from '@ax-llm/ax';

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

export const INSIGHT_INSTRUCTION = `Extract structured insights from the provided AI coding session transcript. For each finding, provide a concrete recommendation — frame insights as actionable guidance, not neutral observations. Tell the developer what to do differently next time.

Focus on:
1. Technical decisions made (architecture, tooling, approach) — recommend alternatives where applicable
2. Friction points encountered (blockers, confusion, errors) — suggest how to prevent or resolve them
3. Effective patterns discovered (workflows, techniques, gotchas) — recommend adoption or adaptation
4. Actionable learnings (transferable lessons) — state what the developer should start, stop, or continue doing

Each insight MUST include:
- A kebab-case category (e.g., "architecture-decision", "debugging-pattern")
- A specific description that includes a recommendation (use language like "should use", "consider", "avoid")
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
 * InsightProgram class that implements the optimizable program.
 *
 * This class splits the original monolithic description into two separate
 * optimizable components:
 * 1. _instruction - The analysis guidance (what to extract)
 * 2. _description - The output format specification (how to respond)
 *
 * This allows GEPA to evolve each part independently while maintaining
 * backward compatibility with existing code that uses programDescription.
 *
 * NOTE: After calling applyOptimizedComponents(), the internal AxGen
 * program is rebuilt so that the next inference call uses the updated
 * instruction + description. Previously, mutations were stored but the
 * program was never rebuilt, meaning all Pareto candidates effectively
 * ran with identical prompts.
 */
export class InsightProgram {
  private _instruction: string = INSIGHT_INSTRUCTION;
  private _description: string = INSIGHT_OUTPUT_FORMAT;
  private _program: any; // AxGen instance

  constructor() {
    this._rebuild();
  }

  // Rebuild the AxGen from current _instruction + _description.
  // MUST be called after any mutation so the next inference uses updated values.
  private _rebuild(): void {
    this._program = ax(`sessionData:string -> insights:json, quality:number`, {
      description: `${this._instruction}\n\n${this._description}`
    });
  }

  // Backward compatibility: combine instruction + description
  get programDescription(): string {
    return `${this._instruction}\n\n${this._description}`;
  }

  // Backward compatibility: split combined description
  set programDescription(value: string) {
    const parts = value.split('\n\n');
    this._instruction = parts[0] || INSIGHT_INSTRUCTION;
    this._description = parts[1] || INSIGHT_OUTPUT_FORMAT;
    this._rebuild();
  }

  // Get the underlying AxGen program
  get program(): any {
    return this._program;
  }

  // Delegate forward() to the AxGen for backward compatibility.
  // Tests and external code call program.forward() directly.
  get forward(): any {
    return this._program?.forward?.bind(this._program);
  }

  // Delegate to AxGen signature for backward compatibility.
  // Tests access program.signature.description to inspect the prompt.
  get signature(): any {
    return this._program?.signature;
  }

  // Current instruction value (for diagnostics/debugging)
  get instruction(): string {
    return this._instruction;
  }

  // Current description value (for diagnostics/debugging)
  get description(): string {
    return this._description;
  }

  // Implement the AxOptimizable interface
  getOptimizableComponents(): AxOptimizableComponent[] {
    return [
      {
        key: "root::instruction",
        current: this._instruction,
        kind: "instruction"
      },
      {
        key: "root::description",
        current: this._description,
        kind: "instruction"
      }
    ];
  }

  applyOptimizedComponents(updates: Record<string, string>): void {
    if (updates["root::instruction"]) {
      this._instruction = updates["root::instruction"];
    }
    if (updates["root::description"]) {
      this._description = updates["root::description"];
    }
    // CRITICAL: Rebuild the AxGen so subsequent inference uses updated components.
    // Without this, all Pareto candidates run with the original prompt.
    this._rebuild();
  }
}

/**
 * Create the insight generation program.
 *
 * Returns an InsightProgram instance that implements the optimizable
 * components interface.
 */
export function createInsightProgram() {
  return new InsightProgram();
}
