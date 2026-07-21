import { useEffect, useMemo, useState } from 'react';
import { format, startOfWeek } from 'date-fns';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Bot, Copy, Download, Loader2, Send } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useSessions } from '@/hooks/useSessions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const today = format(new Date(), 'yyyy-MM-dd');

export default function ReportsPage() {
  const { data: projects = [] } = useProjects();
  const [reportType, setReportType] = useState<ReportType>('weekly');
  const [dateFrom, setDateFrom] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(today);
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

  return (
    <div className="p-3 lg:p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Bot className="h-6 w-6" /> 工作報告助手</h1>
        <p className="text-muted-foreground">根據已同步的工作 session 與 insights，產出可追溯的 Markdown 報告。</p>
      </div>

      <Card>
        <CardHeader><CardTitle>告訴我需要什麼報告</CardTitle><CardDescription>系統只會根據下方日期範圍內的既有資料產出內容。</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2"><Label>報告類型</Label><Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">工作日報</SelectItem><SelectItem value="weekly">工作週報</SelectItem><SelectItem value="project">專案進度報告</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>開始日期</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
            <div className="space-y-2"><Label>結束日期</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
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
