import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CHART_COLORS, PERSONALITY_TRAIT_LABELS } from '@/lib/constants/colors';
import { useThemeColors } from '@/lib/hooks/useThemeColors';
import type { PersonalityTrendRow } from '@/lib/types';

interface PersonalityTrendChartProps {
  rows: PersonalityTrendRow[];
}

/** Line chart of the 4 traits + axis + pace over the last N ISO weeks. */
export function PersonalityTrendChart({ rows }: PersonalityTrendChartProps) {
  const { tooltipBg, tooltipBorder } = useThemeColors();

  const data = rows.map(row => {
    const byKey = Object.fromEntries(row.profile.traits.map(t => [t.key, t.score]));
    return {
      period: row.period,
      precision: byKey.precision ?? null,
      resilience: byKey.resilience ?? null,
      autonomy: byKey.autonomy ?? null,
      craft: byKey.craft ?? null,
      axis: row.profile.axis.value,
      pace: row.profile.pace.value,
    };
  });

  if (data.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trend</CardTitle>
          <CardDescription>Generate a few more weeks to see how your profile changes over time.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Trend</CardTitle>
        <CardDescription>Traits, axis, and pace across the last {data.length} generated weeks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="text-muted-foreground" />
              <YAxis domain={[-100, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  borderColor: tooltipBorder,
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="precision" name={PERSONALITY_TRAIT_LABELS.precision} stroke={CHART_COLORS.personality.precision} connectNulls dot={{ r: 2 }} />
              <Line type="monotone" dataKey="resilience" name={PERSONALITY_TRAIT_LABELS.resilience} stroke={CHART_COLORS.personality.resilience} connectNulls dot={{ r: 2 }} />
              <Line type="monotone" dataKey="autonomy" name={PERSONALITY_TRAIT_LABELS.autonomy} stroke={CHART_COLORS.personality.autonomy} connectNulls dot={{ r: 2 }} />
              <Line type="monotone" dataKey="craft" name={PERSONALITY_TRAIT_LABELS.craft} stroke={CHART_COLORS.personality.craft} connectNulls dot={{ r: 2 }} />
              <Line type="monotone" dataKey="axis" name="Explorer/Executor" stroke={CHART_COLORS.personality.axis} connectNulls dot={{ r: 2 }} strokeDasharray="4 2" />
              <Line type="monotone" dataKey="pace" name="Pace" stroke={CHART_COLORS.personality.pace} connectNulls dot={{ r: 2 }} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
