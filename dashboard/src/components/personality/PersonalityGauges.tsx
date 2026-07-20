import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CHART_COLORS } from '@/lib/constants/colors';
import type { PersonalityBipolarAxis, PersonalityPace } from '@/lib/types';

/**
 * The Explorer<->Executor axis and Pace don't fit naturally on a 0-100 radar (axis is
 * bipolar -100..+100, Pace is a single dial) — rendered here as small standalone
 * gauges instead of forcing them into PersonalityRadarChart.
 */

function axisBand(value: number): 'Explorer-leaning' | 'Balanced' | 'Executor-leaning' {
  if (value >= 34) return 'Executor-leaning';
  if (value <= -34) return 'Explorer-leaning';
  return 'Balanced';
}

export function ExplorerExecutorGauge({ axis }: { axis: PersonalityBipolarAxis }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Explorer &harr; Executor</CardTitle>
        <CardDescription>How sessions lean between open-ended exploration and shipping work</CardDescription>
      </CardHeader>
      <CardContent>
        {axis.value === null ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Insufficient data yet.</p>
        ) : (
          <div className="space-y-2">
            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
              {/* Center tick marks the balanced midpoint */}
              <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
              <div
                className="absolute inset-y-0 rounded-full transition-all"
                style={{
                  width: '6px',
                  backgroundColor: CHART_COLORS.personality.axis,
                  left: `calc(${((axis.value + 100) / 200) * 100}% - 3px)`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Explorer</span>
              <span className="font-medium text-foreground">{axisBand(axis.value)} ({axis.value > 0 ? '+' : ''}{axis.value})</span>
              <span>Executor</span>
            </div>
            <p className="text-xs text-muted-foreground">n={axis.sampleSize} sessions</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PaceGauge({ pace }: { pace: PersonalityPace }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pace</CardTitle>
        <CardDescription>Deliberate vs. rapid iteration relative to session length</CardDescription>
      </CardHeader>
      <CardContent>
        {pace.value === null ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Insufficient data yet.</p>
        ) : (
          <div className="space-y-2">
            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pace.value}%`, backgroundColor: CHART_COLORS.personality.pace }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Deliberate</span>
              <span className="font-medium text-foreground">{pace.value}</span>
              <span>Rapid</span>
            </div>
            <p className="text-xs text-muted-foreground">n={pace.sampleSize} sessions</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
