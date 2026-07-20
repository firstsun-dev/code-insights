import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorCard } from '@/components/ErrorCard';
import { formatTokenCount } from '@/lib/utils';
import { CHART_COLORS } from '@/lib/constants/colors';
import { useThemeColors } from '@/lib/hooks/useThemeColors';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { CacheBySourceRow } from '@/lib/types';
import { useCacheBySource } from '@/hooks/useAnalytics';

type AnalyticsRange = '7d' | '30d' | '90d' | 'all';

interface CacheBySourceCardProps {
  range: AnalyticsRange;
  homeId?: string;
  source?: string;
}

interface FormattedData {
  sourceTool: string;
  cacheCreation: number;
  cacheRead: number;
  sessionCount: number;
  totalInput: number;
  hitRate: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    color: string;
    name: string;
    value: number;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  // Get hit rate from the first payload's context if available
  const hitRate = (payload[0] as any)?.payload?.hitRate ?? 0;

  return (
    <div
      className="p-3 rounded-lg border"
      style={{
        backgroundColor: '#1e293b',
        borderColor: '#334155',
      }}
    >
      <p className="font-bold mb-2 text-slate-50">{label || 'Unknown'}</p>
      {payload.map((entry, index) => (
        <p key={index} style={{ color: entry.color }} className="mb-1 text-xs">
          {entry.name}: {formatTokenCount(entry.value || 0)}
        </p>
      ))}
      <p className="mt-2 text-xs text-slate-400">
        Hit Rate: {hitRate.toFixed(1)}%
      </p>
    </div>
  );
}

export function CacheBySourceCard({ range, homeId, source }: CacheBySourceCardProps) {
  const { tooltipBg, tooltipBorder } = useThemeColors();
  const { data, isLoading, isError } = useCacheBySource(range, homeId, source);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cache Usage by Provider</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cache Usage by Provider</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorCard message="Failed to load cache usage data" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data?.rows ?? [];

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cache Usage by Provider</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[250px] items-center justify-center">
            <p className="text-sm text-muted-foreground">No cache usage data yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formattedData: FormattedData[] = chartData.map((row) => {
    const totalWithCache = (row.cacheRead || 0) + (row.totalInput || 0);
    const hitRate = totalWithCache > 0 ? (row.cacheRead / totalWithCache) * 100 : 0;
    return {
      sourceTool: row.sourceTool || 'Unknown',
      cacheCreation: row.cacheCreationTokens || 0,
      cacheRead: row.cacheReadTokens || 0,
      sessionCount: row.sessionCount,
      totalInput: row.totalInputTokens || 0,
      hitRate,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cache Usage by Provider</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="sourceTool"
                tick={{ fontSize: 11 }}
                angle={-15}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                content={<CustomTooltip />}
                contentStyle={{
                  backgroundColor: tooltipBg,
                  borderColor: tooltipBorder,
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar
                dataKey="cacheRead"
                fill={CHART_COLORS.insightTypes.learning}
                name="Cache Read Tokens"
              />
              <Bar
                dataKey="cacheCreation"
                fill={CHART_COLORS.insightTypes.decision}
                name="Cache Creation Tokens"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Provider</th>
                <th className="py-2 text-right font-medium">Sessions</th>
                <th className="py-2 text-right font-medium">Total Input</th>
                <th className="py-2 text-right font-medium">Cache Creation</th>
                <th className="py-2 text-right font-medium">Cache Read</th>
                <th className="py-2 text-right font-medium">Hit Rate</th>
              </tr>
            </thead>
            <tbody>
              {formattedData.map((row) => (
                <tr key={row.sourceTool} className="border-b last:border-0">
                  <td className="py-2 font-medium">{row.sourceTool}</td>
                  <td className="py-2 text-right">{row.sessionCount}</td>
                  <td className="py-2 text-right">
                    {row.totalInput > 0 ? formatTokenCount(row.totalInput) : '—'}
                  </td>
                  <td className="py-2 text-right">
                    {row.cacheCreation > 0 ? formatTokenCount(row.cacheCreation) : '—'}
                  </td>
                  <td className="py-2 text-right">
                    {row.cacheRead > 0 ? formatTokenCount(row.cacheRead) : '—'}
                  </td>
                  <td className="py-2 text-right">
                    {row.totalInput > 0 || row.cacheRead > 0 ? `${row.hitRate.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
