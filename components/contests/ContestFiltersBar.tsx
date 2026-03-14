import { Surface } from "@/components/ui/Surface";

export type ContestSort = "urgency" | "reward" | "date";

export function ContestFiltersBar({
  query,
  onQuery,
  status,
  onStatus,
  sort,
  onSort,
}: {
  query: string;
  onQuery: (value: string) => void;
  status: string;
  onStatus: (value: string) => void;
  sort: ContestSort;
  onSort: (value: ContestSort) => void;
}) {
  return (
    <Surface>
      <div className="contest-filters-bar">
        <input
          className="collection-search-input"
          placeholder="Search by code or title"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          aria-label="Search contests"
        />

        <select className="collection-select" value={status} onChange={(event) => onStatus(event.target.value)}>
          <option value="ALL">All status</option>
          <option value="OPEN">Open</option>
          <option value="LOCKED">Locked</option>
          <option value="LIVE">Live</option>
          <option value="SETTLED">Settled</option>
          <option value="CANCELED">Canceled</option>
        </select>

        <select className="collection-select" value={sort} onChange={(event) => onSort(event.target.value as ContestSort)}>
          <option value="urgency">Sort: urgency</option>
          <option value="reward">Sort: reward</option>
          <option value="date">Sort: date</option>
        </select>
      </div>
    </Surface>
  );
}
