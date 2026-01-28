import type { StepType } from '../../types';

const TYPES: Array<StepType | 'all'> = ['all', 'llm_call', 'tool_call', 'decision', 'handoff', 'guardrail'];

type SearchBarProps = {
  query: string;
  typeFilter: StepType | 'all';
  onQueryChange: (value: string) => void;
  onTypeFilterChange: (value: StepType | 'all') => void;
};

export default function SearchBar({
  query,
  typeFilter,
  onQueryChange,
  onTypeFilterChange,
}: SearchBarProps) {
  return (
    <div className="search-bar">
      <input
        className="search-input"
        placeholder="Search steps, tools, previews..."
        aria-label="Search steps"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <select
        className="search-select"
        value={typeFilter}
        aria-label="Filter by step type"
        onChange={(event) => onTypeFilterChange(event.target.value as StepType | 'all')}
      >
        {TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
    </div>
  );
}
