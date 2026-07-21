// Re-exports from @code-insights/cli/analysis/personality.
// Single shared scoring module — the server route imports this rather than
// reimplementing trait/axis/pace formulas. See cli/src/analysis/personality.ts
// for the deterministic scoring logic and its documented formula choices.
export {
  computePersonalityProfile,
  PERSONALITY_ANALYSIS_VERSION,
} from '@code-insights/cli/analysis/personality';
export type {
  PersonalityFacetInput,
  PersonalityInsightInput,
} from '@code-insights/cli/analysis/personality';
