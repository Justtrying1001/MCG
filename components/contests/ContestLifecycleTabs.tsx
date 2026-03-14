import { Chip } from "@/components/ui/Chip";

export type ContestLifecycleTab = "OPEN" | "LOCKED" | "LIVE" | "SETTLED";

const tabs: Array<{ key: ContestLifecycleTab; label: string }> = [
  { key: "OPEN", label: "Open" },
  { key: "LOCKED", label: "Locked" },
  { key: "LIVE", label: "Live" },
  { key: "SETTLED", label: "Settled" },
];

export function ContestLifecycleTabs({
  active,
  onChange,
  counts,
}: {
  active: ContestLifecycleTab;
  onChange: (tab: ContestLifecycleTab) => void;
  counts: Partial<Record<ContestLifecycleTab, number>>;
}) {
  return (
    <div className="contest-lifecycle-tabs" role="tablist" aria-label="Contest lifecycle">
      {tabs.map((tab) => (
        <Chip
          key={tab.key}
          label={`${tab.label}${counts[tab.key] ? ` (${counts[tab.key]})` : ""}`}
          selected={active === tab.key}
          onClick={() => onChange(tab.key)}
        />
      ))}
    </div>
  );
}
