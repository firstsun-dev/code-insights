import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SortDirection } from '@/lib/hooks/useSort';

interface SortableThProps {
  label: string;
  active: boolean;
  direction: SortDirection;
  align?: 'left' | 'right';
  onClick: () => void;
}

export function SortableTh({ label, active, direction, align = 'left', onClick }: SortableThProps) {
  const Icon = active ? (direction === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <th className={cn('font-medium', align === 'right' ? 'text-right' : 'text-left')}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          // Padding (rather than the th) grows the tap target to ~44px tall for mobile,
          // with negative margin so it doesn't visually widen the column vs. a plain th.
          'inline-flex items-center gap-1 py-3 px-2 -mx-2 hover:text-foreground transition-colors',
          align === 'right' && 'flex-row-reverse',
          active ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        {label}
        <Icon className="h-3.5 w-3.5 shrink-0" />
      </button>
    </th>
  );
}
