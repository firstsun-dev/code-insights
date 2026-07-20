#!/usr/bin/env node
/**
 * debug-optimization.mjs — Diagnostic tool for GEPA optimization.
 *
 * Creates the insight program, renders the prompt, feeds sample responses
 * through the parser, and logs extracted values. This tool is designed to
 * catch parsing failures (e.g., "insights" vs "Insights" Title Case bug)
 * without needing to run a full optimization cycle.
 *
 * Usage:
 *   node cli/scripts/debug-optimization.mjs [--verbose] [--sample <file>]
 *
 * Options:
 *   --verbose    Show full prompt and parsed output
 *   --sample     Path to a JSON file with sample LLM responses to parse
 *
 * Exit codes:
 *   0 — All diagnostics passed
 *   1 — One or more diagnostics failed (parser mismatches, etc.)
 */

import { createInsightProgram, INSIGHT_INSTRUCTION, INSIGHT_OUTPUT_FORMAT } from '../src/optimization/flow.ts';
import { multiObjectiveMetric, scalarizeScores } from '../src/optimization/metric.ts';

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const sampleIdx = args.indexOf('--sample');
const sampleFile = sampleIdx !== -1 ? args[sampleIdx + 1] : null;

// ── Sample responses for parser testing ──────────────────────────────────────
// These represent the kinds of LLM responses we need to handle correctly.
// Each variant tests a different edge case in the parser.

const BUILTIN_SAMPLES = [
  {
    name: "Standard format (lowercase keys)",
    response: `Here is my analysis:

Insights: {"insights": [{"category":"architecture-decision","description":"Should use dependency injection instead of direct instantiation for better testability","confidence":85,"evidence":["User#3: Created helper directly in module"]}]}
Quality: 0.82`,
    expected: {
      insights: [{ category: "architecture-decision", description: "Should use dependency injection instead of direct instantiation for better testability", confidence: 85, evidence: ["User#3: Created helper directly in module"] }],
      quality: 0.82
    }
  },
  {
    name: "Title Case keys (the bug that started it all)",
    response: `Insights: {"Insights": [{"category":"debugging-pattern","description":"Should add error boundaries around async operations","confidence":78,"evidence":["User#7: Unhandled promise rejection"]}]}
Quality: 0.75`,
    expected: {
      insights: [{ category: "debugging-pattern", description: "Should add error boundaries around async operations", confidence: 78, evidence: ["User#7: Unhandled promise rejection"] }],
      quality: 0.75
    }
  },
  {
    name: "No extra prose — clean response",
    response: `Insights: {"insights": [{"category":"testing-pattern","description":"Consider adding integration tests for the API layer","confidence":92,"evidence":["User#12: Only unit tests present","Assistant#13: No e2e coverage"]}]}
Quality: 0.91`,
    expected: {
      insights: [{ category: "testing-pattern", description: "Consider adding integration tests for the API layer", confidence: 92, evidence: ["User#12: Only unit tests present", "Assistant#13: No e2e coverage"] }],
      quality: 0.91
    }
  },
  {
    name: "Multiple insights",
    response: `Insights: {"insights": [{"category":"performance","description":"Avoid N+1 query pattern by using batch loading","confidence":90,"evidence":["User#1: Loop with DB call inside"]},{"category":"code-style","description":"Prefer named exports over default exports for tree-shaking","confidence":70,"evidence":["User#2: export default function handler"]}]}
Quality: 0.88`,
    expected: {
      insights: [
        { category: "performance", description: "Avoid N+1 query pattern by using batch loading", confidence: 90, evidence: ["User#1: Loop with DB call inside"] },
        { category: "code-style", description: "Prefer named exports over default exports for tree-shaking", confidence: 70, evidence: ["User#2: export default function handler"] }
      ],
      quality: 0.88
    }
  },
  {
    name: "Empty insights",
    response: `Insights: {"insights": []}
Quality: 0.1`,
    expected: { insights: [], quality: 0.1 }
  },
];

// ── Parser (replicates AxFlow's field extraction logic) ──────────────────────
/**
 * Parse an LLM response into { insights, quality }.
 *
 * AxFlow's vs() parser scans for field-title prefixes (e.g., "Insights:", "Quality:")
 * and extracts the text between them. It handles both lowercase and Title Case keys
 * in the JSON that follows.
 */
function parseResponse(response) {
  const result = { insights: [], quality: 0 };

  // Regex to find "Insights:" followed by JSON until "Quality:"
  // The insights block ends when we hit "Quality:" or end of string
  const insightsMatch = response.match(/Insights:\s*([\s\S]*?)(?=Quality:|$)/i);
  if (insightsMatch) {
    try {
      const raw = JSON.parse(insightsMatch[1].trim());
      // Handle both lowercase and Title Case keys
      if (Array.isArray(raw)) {
        result.insights = raw;
      } else if (raw.insights && Array.isArray(raw.insights)) {
        result.insights = raw.insights;
      } else if (raw.Insights && Array.isArray(raw.Insights)) {
        // Title Case variant
        result.insights = raw.Insights;
      }
    } catch (e) {
      if (verbose) {
        console.error(`  [PARSE WARN] Failed to parse Insights JSON: ${e.message}`);
      }
    }
  }

  // Extract Quality score
  const qualityMatch = response.match(/Quality:\s*([\d.]+)/i);
  if (qualityMatch) {
    result.quality = parseFloat(qualityMatch[1]) || 0;
  }

  return result;
}

// ── Test runner ──────────────────────────────────────────────────────────────

function runDiagnostics() {
  let passed = 0;
  let failed = 0;

  console.log("═".repeat(60));
  console.log("  GEPA Optimization Diagnostic Tool");
  console.log("═".repeat(60));
  console.log();

  // ── 1. Component inspection ──────────────────────────────────────────────
  console.log("─".repeat(60));
  console.log("  1. Tunable Components Inspection");
  console.log("─".repeat(60));

  const program = createInsightProgram();
  const components = program.getOptimizableComponents();

  console.log(`  Found ${components.length} optimizable components:`);
  for (const c of components) {
    const preview = c.current.substring(0, 80).replace(/\n/g, '\\n');
    console.log(`    ${c.key} (${c.kind})`);
    if (verbose) {
      console.log(`      Value: ${preview}...`);
      console.log(`      Length: ${c.current.length} chars`);
    }
  }

  // Verify the split is real — instruction and description must differ
  const instrComp = components.find(c => c.key === "root::instruction");
  const descComp = components.find(c => c.key === "root::description");

  if (!instrComp || !descComp) {
    console.error("  FAIL: Missing expected components root::instruction or root::description");
    failed++;
  } else if (instrComp.current === descComp.current) {
    console.error("  FAIL: instruction and description are identical — split is not working");
    failed++;
  } else {
    console.log("  PASS: instruction and description are independent components");
    passed++;
  }

  // Verify instruction contains analysis guidance (not just format)
  if (instrComp && instrComp.current.includes("Extract structured insights")) {
    console.log("  PASS: instruction contains analysis guidance");
    passed++;
  } else {
    console.error("  FAIL: instruction missing analysis guidance");
    failed++;
  }

  // Verify description contains output format
  if (descComp && descComp.current.includes("Respond with two labeled blocks")) {
    console.log("  PASS: description contains output format specification");
    passed++;
  } else {
    console.error("  FAIL: description missing output format specification");
    failed++;
  }

  console.log();

  // ── 2. Component mutation test ───────────────────────────────────────────
  console.log("─".repeat(60));
  console.log("  2. Component Mutation Test");
  console.log("─".repeat(60));

  const testInstruction = "TEST INSTRUCTION: Analyze the session for testing patterns.";
  const testDescription = "TEST FORMAT: Output JSON with 'results' array.";

  program.applyOptimizableComponents({
    "root::instruction": testInstruction,
    "root::description": testDescription
  });

  const afterComponents = program.getOptimizableComponents();
  const afterInstr = afterComponents.find(c => c.key === "root::instruction");
  const afterDesc = afterComponents.find(c => c.key === "root::description");

  if (afterInstr && afterInstr.current === testInstruction) {
    console.log("  PASS: instruction mutated successfully");
    passed++;
  } else {
    console.error(`  FAIL: instruction not applied. Got: ${afterInstr?.current?.substring(0, 50)}`);
    failed++;
  }

  if (afterDesc && afterDesc.current === testDescription) {
    console.log("  PASS: description mutated successfully");
    passed++;
  } else {
    console.error(`  FAIL: description not applied. Got: ${afterDesc?.current?.substring(0, 50)}`);
    failed++;
  }

  // Reset to defaults
  program.applyOptimizableComponents({
    "root::instruction": INSIGHT_INSTRUCTION,
    "root::description": INSIGHT_OUTPUT_FORMAT
  });

  console.log();

  // ── 3. Parser tests ──────────────────────────────────────────────────────
  console.log("─".repeat(60));
  console.log("  3. Response Parser Tests");
  console.log("─".repeat(60));

  // Load custom samples if provided
  let samples = BUILTIN_SAMPLES;
  if (sampleFile) {
    try {
      const fs = await import('node:fs');
      const customData = JSON.parse(fs.readFileSync(sampleFile, 'utf-8'));
      if (Array.isArray(customData)) {
        samples = customData;
        console.log(`  Loaded ${customData.length} custom samples from ${sampleFile}`);
      }
    } catch (e) {
      console.error(`  WARN: Failed to load custom samples: ${e.message}`);
      console.error("  Falling back to built-in samples");
    }
  }

  for (const sample of samples) {
    const parsed = parseResponse(sample.response);

    // Check insights
    const insightsOk = JSON.stringify(parsed.insights) === JSON.stringify(sample.expected.insights);
    const qualityOk = Math.abs(parsed.quality - sample.expected.quality) < 0.01;

    if (insightsOk && qualityOk) {
      console.log(`  PASS: ${sample.name}`);
      passed++;
    } else {
      console.error(`  FAIL: ${sample.name}`);
      if (!insightsOk) {
        console.error(`    Expected insights: ${JSON.stringify(sample.expected.insights)}`);
        console.error(`    Got insights:      ${JSON.stringify(parsed.insights)}`);
      }
      if (!qualityOk) {
        console.error(`    Expected quality: ${sample.expected.quality}`);
        console.error(`    Got quality:      ${parsed.quality}`);
      }
      failed++;
    }

    if (verbose) {
      console.log(`    Parsed: ${JSON.stringify(parsed, null, 2).split('\n').map(l => '    ' + l).join('\n')}`);
    }
  }

  console.log();

  // ── 4. Metric pipeline test ──────────────────────────────────────────────
  console.log("─".repeat(60));
  console.log("  4. Metric Pipeline Test");
  console.log("─".repeat(60));

  // Test with a well-formed parsed response
  const goodPrediction = {
    insights: [
      {
        category: "architecture-decision",
        description: "Should use dependency injection for better testability",
        confidence: 85,
        evidence: ["User#3: Created helper directly"]
      },
      {
        category: "testing-pattern",
        description: "Consider adding integration tests for the API layer",
        confidence: 92,
        evidence: ["User#12: Only unit tests present"]
      }
    ],
    quality: 0.85
  };

  const goodExample = {
    sessionData: "User: I created a helper function directly in my module instead of using dependency injection. Assistant: That works but consider DI for testability.",
    sessionTopics: ["dependency injection", "testability", "helper function"],
    expectedInsightCount: 2
  };

  try {
    const scores = multiObjectiveMetric({ prediction: goodPrediction, example: goodExample });
    const scalar = scalarizeScores(scores);

    console.log(`  Coverage:     ${scores.coverage.toFixed(3)}`);
    console.log(`  Precision:    ${scores.precision.toFixed(3)}`);
    console.log(`  Actionability:${scores.actionability.toFixed(3)}`);
    console.log(`  Brevity:      ${scores.brevity.toFixed(3)}`);
    console.log(`  Scalarized:   ${scalar.toFixed(3)}`);

    if (scores.coverage > 0 && scores.precision > 0 && scores.actionability > 0) {
      console.log("  PASS: Metric pipeline produces non-zero scores for good input");
      passed++;
    } else {
      console.error("  FAIL: Metric pipeline produces zero scores for good input");
      failed++;
    }
  } catch (e) {
    console.error(`  FAIL: Metric pipeline threw: ${e.message}`);
    failed++;
  }

  // Test with Title Case keys (the bug scenario)
  const titleCasePrediction = {
    Insights: [
      {
        category: "debugging-pattern",
        description: "Should add error boundaries around async operations",
        confidence: 78,
        evidence: ["User#7: Unhandled promise"]
      }
    ],
    quality: 0.75
  };

  try {
    const tcScores = multiObjectiveMetric({
      prediction: titleCasePrediction as any,
      example: { sessionData: "test", sessionTopics: [], expectedInsightCount: 1 }
    });

    if (tcScores.precision > 0 || tcScores.coverage > 0) {
      console.log("  PASS: Metric handles Title Case keys (normalizeInsights works)");
      passed++;
    } else {
      console.error("  FAIL: Metric returns all zeros for Title Case input (normalizeInsights not working)");
      failed++;
    }
  } catch (e) {
    console.error(`  FAIL: Metric crashed on Title Case input: ${e.message}`);
    failed++;
  }

  console.log();

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("═".repeat(60));
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("═".repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

// ── Run ───────────────────────────────────────────────────────────────────────

runDiagnostics().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  if (verbose) {
    console.error(err.stack);
  }
  process.exit(1);
});
