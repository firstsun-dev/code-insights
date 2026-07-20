import { cn } from '@/lib/utils';
import { INSIGHT_TYPE_LABELS } from '@/lib/constants/colors';
import type { InsightType } from '@/lib/types';

const ALL_TYPES: InsightType[] = ['summary', 'decision', 'learning', 'technique', 'prompt_quality'];

// 'technique' is a legacy alias that always displays as "Learning" (see INSIGHT_TYPE_LABELS) —
// render one pill for it and treat toggling 'learning' as toggling both underlying types.
const DISPLAY_TYPES: InsightType[] = ['summary', 'decision', 'learning', 'prompt_quality'];
const MERGED_TYPES: Partial<Record<InsightType, InsightType[]>> = {
  learning: ['learning', 'technique'],
};

function expand(type: InsightType): InsightType[] {
  return MERGED_TYPES[type] ?? [type];
}

interface InsightTypePillsProps {
  /** Currently active types. Empty array = all types shown. */
  activeTypes: InsightType[];
  onChange: (types: InsightType[]) => void;
}

/**
 * Multi-select toggleable pills for insight type filtering.
 * All active = no filter (same as "all").
 * All inactive = treated as all (prevents zero-result dead-end).
 */
export function InsightTypePills({ activeTypes, onChange }: InsightTypePillsProps) {
  const allActive = activeTypes.length === 0 || activeTypes.length === ALL_TYPES.length;

  function toggle(type: InsightType) {
    const group = expand(type);
    if (allActive) {
      // Start fresh: select only this type (and its merged aliases)
      onChange(group);
      return;
    }
    const isActive = group.some((t) => activeTypes.includes(t));
    if (isActive) {
      const next = activeTypes.filter((t) => !group.includes(t));
      // If removing last one, reset to all
      onChange(next.length === 0 ? [] : next);
    } else {
      const next = [...new Set([...activeTypes, ...group])];
      // If all are now selected, reset to empty (= all)
      onChange(next.length === ALL_TYPES.length ? [] : next);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by insight type">
      {DISPLAY_TYPES.map((type) => {
        const group = expand(type);
        const isActive = allActive || group.some((t) => activeTypes.includes(t));
        return (
          <button
            key={type}
            onClick={() => toggle(type)}
            aria-pressed={isActive}
            className={cn(
              'h-7 px-2.5 text-xs rounded-full cursor-pointer transition-colors border',
              isActive
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'bg-transparent text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'
            )}
          >
            {INSIGHT_TYPE_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}
