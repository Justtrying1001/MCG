import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";

const RECENT_PULLS = [
  "Genesis Pepe · Legendary",
  "Signal Drop · Rare",
  "Moon Cat · Epic",
  "Rocket Frog · Rare",
  "Turbo Doge · Uncommon",
];

export function RecentPullsRail() {
  return (
    <Surface className="mcg-anim-fade-up">
      <div className="mcg-home-section">
        <SectionHeader eyebrow="Live activity" title="Recent Pulls" subtitle="Fresh reveals from active players." />
        <div className="mcg-rail">
          {RECENT_PULLS.map((entry) => (
            <div key={entry} className="mcg-mini-card">
              <strong>{entry}</strong>
              <span>just now</span>
            </div>
          ))}
        </div>
      </div>
    </Surface>
  );
}
