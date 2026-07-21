import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Home } from '@/lib/types';

interface HomeMultiSelectProps {
  homes: Home[];
  value: string[];
  onValueChange: (value: string[]) => void;
  className?: string;
}

export function HomeMultiSelect({ homes, value, onValueChange, className }: HomeMultiSelectProps) {
  const toggle = (id: string) => {
    onValueChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  };

  const label = value.length === 0
    ? 'All Homes'
    : value.length === 1
      ? homes.find((home) => home.id === value[0])?.label ?? '1 Home'
      : `${value.length} Homes selected`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`justify-between font-normal ${className ?? ''}`}>{label}</Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <div className="flex items-center justify-between px-2 py-1.5 text-xs text-muted-foreground">
          <span>Select one or more homes</span>
          {value.length > 0 && <button type="button" className="hover:text-foreground" onClick={() => onValueChange([])}>Clear</button>}
        </div>
        <div className="max-h-56 overflow-y-auto">
          {homes.map((home) => (
            <label key={home.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm hover:bg-accent">
              <Checkbox checked={value.includes(home.id)} onCheckedChange={() => toggle(home.id)} />
              <span className="truncate">{home.label}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
