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
import { CHART_COLORS, COGNITIVE_FUNCTION_LABELS } from '@/lib/constants/colors';
import { useThemeColors } from '@/lib/hooks/useThemeColors';
import type { CognitiveFunctionScore } from '@/lib/types';

interface CognitiveFunctionRadarChartProps {
  functions: CognitiveFunctionScore[];
}

/**
 * Radar chart for the 8 Jungian cognitive functions (Ni/Ne/Si/Se/Ti/Te/Fi/Fe), each on
 * a 0-100 scale. Same conventions as PersonalityRadarChart: functions with a null score
 * (insufficient data) are excluded from the plotted polygon rather than plotted as 0 —
 * plotting null-as-0 would misrepresent "not enough data yet" as "measured and low".
 * Instead they're listed below the chart as an explicit "insufficient data" note.
 */
export function CognitiveFunctionRadarChart({ functions }: CognitiveFunctionRadarChartProps) {
  const { tooltipBg, tooltipBorder } = useThemeColors();

  const measured = functions.filter(f => f.score !== null);
  const insufficient = functions.filter(f => f.score === null);

  const data = measured.map(f => ({
    fn: COGNITIVE_FUNCTION_LABELS[f.key],
    score: f.score as number,
    sampleSize: f.sampleSize,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cognitive Function Profile</CardTitle>
        <CardDescription>The 8 Jungian cognitive functions — each 0-100</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length >= 3 ? (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} outerRadius="70%">
                <PolarGrid className="stroke-muted" />
                <PolarAngleAxis dataKey="fn" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke={CHART_COLORS.cognitiveFunctions.ni}
                  fill={CHART_COLORS.cognitiveFunctions.ni}
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
            Not enough analyzed sessions yet to plot a cognitive function profile.
          </p>
        )}

        {insufficient.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Insufficient data for:{' '}
            {insufficient.map(f => COGNITIVE_FUNCTION_LABELS[f.key]).join(', ')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
