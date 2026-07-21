import { usePersonalityProjects } from '@/hooks/usePersonalityProfile';

interface ProjectPersonalitySwitcherProps {
  value: string; // '__all__' or a project id
  onChange: (projectId: string) => void;
  period: string; // ISO week — scopes the project list to projects with data for this period
}

/** Dropdown to scope the personality profile to '__all__' (All Projects) or one project.
 * Uses GET /api/personality/projects, which only returns projects that have at least
 * one analyzed (facet) session within `period` — selecting any listed project is
 * guaranteed to have data, unlike the generic project list from useProjects(). */
export function ProjectPersonalitySwitcher({ value, onChange, period }: ProjectPersonalitySwitcherProps) {
  const { data } = usePersonalityProjects({ period });
  const projects = data?.projects ?? [];

  if (projects.length <= 1) return null;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border bg-background px-2 text-xs"
    >
      <option value="__all__">All Projects</option>
      {projects.map(p => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  );
}
