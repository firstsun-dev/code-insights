import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useHomes } from '@/hooks';

interface HomeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function HomeSelect({ value, onValueChange, className }: HomeSelectProps) {
  const { data: homes = [] } = useHomes();

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="All Homes" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Homes</SelectItem>
        {homes.map((home) => (
          <SelectItem key={home.id} value={home.id}>
            {home.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
