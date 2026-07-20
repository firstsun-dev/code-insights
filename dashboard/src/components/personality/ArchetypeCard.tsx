import { Sparkles, TrendingUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PersonalityArchetype } from '@/lib/types';

interface ArchetypeCardProps {
  archetype?: PersonalityArchetype;
  generating: boolean;
  onGenerate: () => void;
}

/**
 * Displays the LLM-generated archetype narrative (tagline/subtitle/narrative/strengths/
 * growthAreas). Renders gracefully with a "Generate" CTA when archetype hasn't been
 * generated yet — this is the expected initial state, not an error.
 */
export function ArchetypeCard({ archetype, generating, onGenerate }: ArchetypeCardProps) {
  if (!archetype) {
    return (
      <Card className="border-l-2 border-primary">
        <CardContent className="py-6 flex flex-col items-center text-center gap-3">
          <Sparkles className="h-6 w-6 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">No personality narrative yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Generate a short archetype description from your trait scores.
            </p>
          </div>
          <Button onClick={onGenerate} disabled={generating} size="sm">
            {generating ? (
              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Generating...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-1.5" />Generate personality narrative</>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-2 border-primary">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-xl">{archetype.tagline || 'Your Personality Profile'}</CardTitle>
            {archetype.tagline_subtitle && (
              <CardDescription className="mt-1">{archetype.tagline_subtitle}</CardDescription>
            )}
          </div>
          <Button onClick={onGenerate} disabled={generating} size="sm" variant="ghost">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{archetype.narrative}</p>

        {archetype.strengths.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Strengths
            </p>
            <div className="flex flex-wrap gap-1.5">
              {archetype.strengths.map((s, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
              ))}
            </div>
          </div>
        )}

        {archetype.growthAreas.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Growth areas</p>
            <div className="flex flex-wrap gap-1.5">
              {archetype.growthAreas.map((g, i) => (
                <Badge key={i} variant="outline" className="text-xs">{g}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
