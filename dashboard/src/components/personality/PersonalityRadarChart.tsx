import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CHART_COLORS, PERSONALITY_TRAIT_LABELS } from '@/lib/constants/colors';
import { useThemeColors } from '@/lib/hooks/useThemeColors';
import type { PersonalityTrait } from '@/lib/types';

interface PersonalityRadarChartProps {
  traits: PersonalityTrait[];
}

/**
 * Radar chart for the 4 unipolar personality traits (Precision/Resilience/Autonomy/
 * Craft), each on a 0-100 scale. Traits with a null score (insufficient data) are
 * deliberately excluded from the plotted polygon rather than plotted as 0 — plotting
 * null-as-0 would misrepresent "not enough data yet" as "measured and low". Instead
 * they're listed below the chart as an explicit "insufficient data" note.
 */
export function PersonalityRadarChart({ traits }: PersonalityRadarChartProps) {
  const { tooltipBg, tooltipBorder } = useThemeColors();

  const measured = traits.filter(t => t.score !== null);
  const insufficient = traits.filter(t => t.score === null);

  const data = measured.map(t => ({
    trait: PERSONALITY_TRAIT_LABELS[t.key],
    score: t.score as number,
    sampleSize: t.sampleSize,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Trait Profile</CardTitle>
        <CardDescription>Precision, Resilience, Autonomy, and Craft — each 0-100</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length >= 3 ? (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} outerRadius="70%">
                <PolarGrid className="stroke-muted" />
                <PolarAngleAxis dataKey="trait" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke={CHART_COLORS.personality.precision}
                  fill={CHART_COLORS.personality.precision}
                  fillOpacity={0.35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value, _name, item) => [
                    `${value} (n=${(item?.payload as { sampleSize: number } | undefined)?.sampleSize ?? 0})`,
                    'Score',
                  ]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Not enough analyzed sessions yet to plot a trait profile.
          </p>
        )}

        {insufficient.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Insufficient data for:{' '}
            {insufficient.map(t => PERSONALITY_TRAIT_LABELS[t.key]).join(', ')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
