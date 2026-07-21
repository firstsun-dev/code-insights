import { useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export function useSort<T, K extends string>(
  data: T[],
  getValue: (item: T, key: K) => string | number,
  initial: { key: K; direction: SortDirection }
) {
  const [sortKey, setSortKey] = useState<K>(initial.key);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initial.direction);

  const sorted = useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
      const av = getValue(a, sortKey);
      const bv = getValue(b, sortKey);
      const cmp =
        typeof av === 'string' && typeof bv === 'string'
          ? av.localeCompare(bv)
          : (av as number) - (bv as number);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sortKey, sortDirection]);

  function toggleSort(key: K) {
    if (key === sortKey) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }

  return { sorted, sortKey, sortDirection, toggleSort };
}
