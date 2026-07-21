import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Bot, CalendarDays, ChevronLeft, ChevronRight, Copy, Download, Loader2, Send } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useSessions } from '@/hooks/useSessions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { HomeSelect } from '@/components/filters/HomeSelect';
import { ProjectMultiSelect } from '@/components/filters/ProjectMultiSelect';

type ReportType = 'daily' | 'weekly' | 'project';
interface ReportResult {
  markdown: string;
  model: string;
  sourceCount: number;
  sources: Array<{ sessionId: string; title: string; projectName: string; startedAt: string }>;
}

interface DateRange {
  from: string;
  to: string;
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

function dateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function reportRange(type: ReportType, anchor: Date): DateRange {
  if (type === 'daily') return { from: dateString(anchor), to: dateString(anchor) };
  if (type === 'weekly') return { from: dateString(subDays(anchor, 6)), to: dateString(anchor) };
  return { from: dateString(startOfWeek(anchor, { weekStartsOn: 1 })), to: dateString(anchor) };
}

function rangeLabel(from: string, to: string): string {
  const start = parseISO(from);
  const end = parseISO(to);
  return isSameDay(start, end) ? format(start, 'yyyy/MM/dd') : `${format(start, 'yyyy/MM/dd')} – ${format(end, 'yyyy/MM/dd')}`;
}

export default function ReportsPage() {
  const { data: projects = [] } = useProjects();
  const [reportType, setReportType] = useState<ReportType>('weekly');
  const [dateFrom, setDateFrom] = useState(() => reportRange('weekly', new Date()).from);
  const [dateTo, setDateTo] = useState(() => reportRange('weekly', new Date()).to);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [projectRangeStart, setProjectRangeStart] = useState<Date | null>(null);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [homeId, setHomeId] = useState('all');
  const [instructions, setInstructions] = useState('');
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: homeSessions = [] } = useSessions({ limit: 500, ...(homeId !== 'all' && { homeId }) });
  const availableProjects = useMemo(() => {
    const ids = new Set(homeSessions.map((session) => session.project_id));
    return projects.filter((project) => ids.has(project.id));
  }, [homeSessions, projects]);

  useEffect(() => {
    const availableIds = new Set(availableProjects.map((project) => project.id));
    setProjectIds((selected) => {
      const next = selected.filter((id) => availableIds.has(id));
      return next.length === selected.length ? selected : next;
    });
  }, [availableProjects]);

  const setType = (type: ReportType) => {
    setReportType(type);
    setProjectRangeStart(null);
    if (type === 'project') return;

    const range = reportRange(type, parseISO(dateTo));
    setDateFrom(range.from);
    setDateTo(range.to);
    setCalendarMonth(parseISO(range.to));
  };

  const selectDate = (day: Date) => {
    if (reportType === 'daily' || reportType === 'weekly') {
      const range = reportRange(reportType, day);
      setDateFrom(range.from);
      setDateTo(range.to);
      setCalendarOpen(false);
      return;
    }

    if (!projectRangeStart) {
      setProjectRangeStart(day);
      setDateFrom(dateString(day));
      setDateTo(dateString(day));
      return;
    }

    const start = projectRangeStart <= day ? projectRangeStart : day;
    const end = projectRangeStart <= day ? day : projectRangeStart;
    setDateFrom(dateString(start));
    setDateTo(dateString(end));
    setProjectRangeStart(null);
    setCalendarOpen(false);
  };

  const generate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType, dateFrom, dateTo, projectIds: projectIds.length ? projectIds : undefined, homeId: homeId === 'all' ? undefined : homeId, instructions: instructions.trim() || undefined }),
      });
      const body = await response.json() as ReportResult & { error?: string };
      if (!response.ok) throw new Error(body.error || '無法產出工作報告');
      setResult(body);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '無法產出工作報告');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.markdown);
    toast.success('已複製 Markdown 報告');
  };

  const download = () => {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([result.markdown], { type: 'text/markdown' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `work-report-${dateFrom}-${dateTo}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const rangeStart = parseISO(dateFrom);
  const rangeEnd = parseISO(dateTo);
  const calendarStart = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 1 });
  const calendarDays: Date[] = [];
  for (let day = calendarStart; day <= calendarEnd; day = addDays(day, 1)) calendarDays.push(day);

  return (
    <div className="p-3 lg:p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Bot className="h-6 w-6" /> 工作報告助手</h1>
        <p className="text-muted-foreground">根據已同步的工作 session 與 insights，產出可追溯的 Markdown 報告。</p>
      </div>

      <Card>
        <CardHeader><CardTitle>告訴我需要什麼報告</CardTitle><CardDescription>系統只會根據下方日期範圍內的既有資料產出內容。</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2"><Label>報告類型</Label><Select value={reportType} onValueChange={(value) => setType(value as ReportType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">工作日報</SelectItem><SelectItem value="weekly">工作週報</SelectItem><SelectItem value="project">專案進度報告</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>日期範圍</Label><Popover open={calendarOpen} onOpenChange={(open) => { setCalendarOpen(open); if (!open) setProjectRangeStart(null); }}><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start font-normal"><CalendarDays className="mr-2 h-4 w-4" />{rangeLabel(dateFrom, dateTo)}</Button></PopoverTrigger><PopoverContent align="start" className="w-[21rem] p-3"><div className="mb-3 flex items-center justify-between"><Button variant="ghost" size="icon" aria-label="上一個月" onClick={() => setCalendarMonth((month) => addMonths(month, -1))}><ChevronLeft className="h-4 w-4" /></Button><span className="text-sm font-medium">{format(calendarMonth, 'yyyy 年 M 月')}</span><Button variant="ghost" size="icon" aria-label="下一個月" onClick={() => setCalendarMonth((month) => addMonths(month, 1))}><ChevronRight className="h-4 w-4" /></Button></div><div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">{WEEKDAYS.map((weekday) => <span key={weekday} className="py-1">{weekday}</span>)}</div><div className="grid grid-cols-7 gap-1">{calendarDays.map((day) => { const inRange = day >= rangeStart && day <= rangeEnd; const selected = isSameDay(day, rangeStart) || isSameDay(day, rangeEnd); return <Button key={day.toISOString()} type="button" variant="ghost" size="sm" className={`h-8 w-8 p-0 ${!isSameMonth(day, calendarMonth) ? 'text-muted-foreground/50' : ''} ${inRange ? 'bg-accent' : ''} ${selected ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground' : ''}`} onClick={() => selectDate(day)}>{format(day, 'd')}</Button>; })}</div><p className="mt-3 text-xs text-muted-foreground">{reportType === 'daily' ? '選擇一天作為日報範圍。' : reportType === 'weekly' ? '選擇結束日，系統會自動涵蓋前 7 天。' : projectRangeStart ? '再選擇結束日期。' : '先選擇開始日期，再選擇結束日期。'}</p></PopoverContent></Popover></div>
            <div className="space-y-2"><Label>專案（可多選）</Label><ProjectMultiSelect projects={availableProjects} value={projectIds} onValueChange={setProjectIds} /></div>
            <div className="space-y-2"><Label>Home Directory</Label><HomeSelect value={homeId} onValueChange={setHomeId} /></div>
          </div>
          <div className="space-y-2"><Label>補充要求（選填）</Label><Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={500} placeholder="例如：著重列出阻塞因素，給主管閱讀。" /></div>
          <Button onClick={generate} disabled={loading || !dateFrom || !dateTo}><>{loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}產出報告</></Button>
        </CardContent>
      </Card>

      {result && <Card>
        <CardHeader className="flex-row items-start justify-between gap-4"><div><CardTitle>報告預覽</CardTitle><CardDescription>使用 {result.sourceCount} 個工作 session 產出 · {result.model}</CardDescription></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={copy}><Copy className="h-4 w-4 mr-1" />複製</Button><Button variant="outline" size="sm" onClick={download}><Download className="h-4 w-4 mr-1" />下載</Button></div></CardHeader>
        <CardContent className="space-y-5"><Textarea value={result.markdown} onChange={(e) => setResult({ ...result, markdown: e.target.value })} className="min-h-80 font-mono text-sm" aria-label="工作報告 Markdown" />
          <div><h2 className="text-sm font-semibold mb-2">資料來源</h2><div className="flex flex-wrap gap-2">{result.sources.map((source) => <Button key={source.sessionId} variant="secondary" size="sm" asChild><Link to={`/sessions/${source.sessionId}`}>{source.projectName} · {source.title}</Link></Button>)}</div></div>
        </CardContent>
      </Card>}
    </div>
  );
}
