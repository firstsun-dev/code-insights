import { useProjects } from '@/hooks/useProjects';

interface ProjectPersonalitySwitcherProps {
  value: string; // '__all__' or a project id
  onChange: (projectId: string) => void;
}

/** Dropdown to scope the personality profile to '__all__' (All Projects) or one project.
 * Reuses useProjects() — the same project-listing hook PatternsPage uses — rather than
 * introducing a new endpoint. */
export function ProjectPersonalitySwitcher({ value, onChange }: ProjectPersonalitySwitcherProps) {
  const { data: projects = [] } = useProjects();

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
