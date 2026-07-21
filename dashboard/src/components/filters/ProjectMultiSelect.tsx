import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Project } from '@/lib/types';

interface ProjectMultiSelectProps {
  projects: Project[];
  value: string[];
  onValueChange: (value: string[]) => void;
}

export function ProjectMultiSelect({ projects, value, onValueChange }: ProjectMultiSelectProps) {
  const toggle = (id: string) => {
    onValueChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  };
  const label = value.length === 0
    ? '所有專案'
    : value.length === 1
      ? projects.find((project) => project.id === value[0])?.name ?? '1 個專案'
      : `已選 ${value.length} 個專案`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between font-normal">{label}</Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <div className="flex items-center justify-between px-2 py-1.5 text-xs text-muted-foreground">
          <span>選擇一或多個專案</span>
          {value.length > 0 && <button type="button" className="hover:text-foreground" onClick={() => onValueChange([])}>清除</button>}
        </div>
        <div className="max-h-56 overflow-y-auto">
          {projects.map((project) => (
            <label key={project.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm hover:bg-accent">
              <Checkbox checked={value.includes(project.id)} onCheckedChange={() => toggle(project.id)} />
              <span className="truncate">{project.name}</span>
            </label>
          ))}
          {projects.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">此 Home Directory 沒有工作 session。</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
