import { Fingerprint } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { COGNITIVE_FUNCTION_LABELS, COGNITIVE_FUNCTION_SHORT_LABELS } from '@/lib/constants/colors';
import type { MBTIProfile, CognitiveFunctionScore } from '@/lib/types';

interface MbtiCardProps {
  mbti: MBTIProfile;
  functions: CognitiveFunctionScore[];
}

const CONFIDENCE_BADGE_VARIANT: Record<'low' | 'moderate' | 'high', 'outline' | 'secondary' | 'default'> = {
  low: 'outline',
  moderate: 'secondary',
  high: 'default',
};

const STACK_ROLE_LABELS = ['Dominant', 'Auxiliary', 'Tertiary', 'Inferior'];

/**
 * Displays the derived MBTI type from the 8 cognitive function scores: the 4-letter
 * type, its confidence (based on how many of the 8 functions we actually observed —
 * see mbtiConfidenceFor in cli/src/analysis/personality.ts), and the function stack
 * (dominant -> auxiliary -> tertiary -> inferior) with each function's own score.
 * Renders gracefully with a "not enough data yet" state when type is null — this is
 * the expected initial state (fewer than 2 non-null function scores), not an error.
 */
export function MbtiCard({ mbti, functions }: MbtiCardProps) {
  const scoreByKey = new Map(functions.map(f => [f.key, f.score]));

  if (mbti.type === null || mbti.functionStack === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-muted-foreground" />
            Cognitive Type
          </CardTitle>
          <CardDescription>A derived MBTI-style type based on your dominant cognitive functions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">
            Not enough data yet — analyze more sessions to derive a cognitive type.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-muted-foreground" />
              Cognitive Type
            </CardTitle>
            <CardDescription>Derived from your cognitive function scores</CardDescription>
          </div>
          {mbti.confidence && (
            <Badge variant={CONFIDENCE_BADGE_VARIANT[mbti.confidence]} className="text-xs capitalize">
              {mbti.confidence} confidence
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-4xl font-bold tracking-tight">{mbti.type}</p>

        <div className="space-y-2">
          {mbti.functionStack.map((fn, i) => {
            const score = scoreByKey.get(fn) ?? null;
            return (
              <div key={fn} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">
                    {STACK_ROLE_LABELS[i]}
                  </span>
                  <span className="font-mono font-medium">{COGNITIVE_FUNCTION_SHORT_LABELS[fn]}</span>
                  <span className="text-xs text-muted-foreground">{COGNITIVE_FUNCTION_LABELS[fn].split(' — ')[1]}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {score !== null ? score : '—'}
                </span>
              </div>
            );
          })}
        </div>

        {/* topCandidates is LLM-authored (see PERSONALITY_SYSTEM_PROMPT in
            server/src/llm/reflect-prompts.ts) — a softer, ranked "top 5 guesses with
            reasoning" companion view over the same function scores, distinct from the
            single deterministic type above. Only present after Generate has run once;
            no separate CTA here — the ArchetypeCard's Generate button above populates
            this too, in the same LLM call. */}
        {mbti.topCandidates && mbti.topCandidates.length > 0 && (
          <div className="pt-2 border-t space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Top 5 likely types (LLM-ranked)</p>
            {mbti.topCandidates.map(candidate => (
              <div key={candidate.type} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{candidate.rank}.</span>
                    <span className="font-mono font-medium">{candidate.type}</span>
                    {candidate.type === mbti.type && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">deterministic match</Badge>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">{candidate.likelihood}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/70 transition-all"
                    style={{ width: `${candidate.likelihood}%` }}
                  />
                </div>
                {candidate.reasoning && (
                  <p className="text-xs text-muted-foreground leading-snug">{candidate.reasoning}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
