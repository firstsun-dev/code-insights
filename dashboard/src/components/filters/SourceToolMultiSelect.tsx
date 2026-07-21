import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAvailableSourceTools } from '@/hooks/useFacets';
import { SOURCE_TOOL_DISPLAY_NAMES } from '@/lib/share-card-icons';

// Extract the dot color class from SOURCE_TOOL_COLORS badge string (e.g. "bg-orange-500/10 text-orange-600 ...")
// We only need the text color for the dot background — use the bg-*-500/10 converted to bg-*-500
const DOT_COLORS: Record<string, string> = {
  'claude-code': 'bg-orange-500',
  'cursor': 'bg-blue-500',
  'codex-cli': 'bg-green-500',
  'copilot-cli': 'bg-cyan-500',
  'copilot': 'bg-violet-500',
  'opencode': 'bg-purple-500',
  'antigravity': 'bg-red-500',
  'crush': 'bg-yellow-500',
  'hermes-agent': 'bg-pink-500',
  'mistral-vibe': 'bg-indigo-500',
  'kilo': 'bg-teal-500',
};

function toTitleCase(id: string): string {
  return id
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function labelFor(id: string): string {
  return SOURCE_TOOL_DISPLAY_NAMES[id] ?? toTitleCase(id);
}

function dotColorFor(id: string): string {
  return DOT_COLORS[id] ?? 'bg-gray-400';
}

interface SourceToolMultiSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  className?: string;
}

export function SourceToolMultiSelect({ value, onValueChange, className }: SourceToolMultiSelectProps) {
  const { data: sourceTools = [] } = useAvailableSourceTools();

  const toggle = (id: string) => {
    onValueChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  };

  const label = value.length === 0
    ? '所有來源'
    : value.length === 1
      ? labelFor(value[0])
      : `已選 ${value.length} 個來源`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`justify-between font-normal ${className ?? ''}`}>{label}</Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <div className="flex items-center justify-between px-2 py-1.5 text-xs text-muted-foreground">
          <span>選擇一或多個來源</span>
          {value.length > 0 && <button type="button" className="hover:text-foreground" onClick={() => onValueChange([])}>清除</button>}
        </div>
        <div className="max-h-56 overflow-y-auto">
          {sourceTools.map((tool) => (
            <label key={tool} className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm hover:bg-accent">
              <Checkbox checked={value.includes(tool)} onCheckedChange={() => toggle(tool)} />
              <span className={`h-2 w-2 rounded-full shrink-0 ${dotColorFor(tool)}`} />
              <span className="truncate">{labelFor(tool)}</span>
            </label>
          ))}
          {sourceTools.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">沒有可用的來源。</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
