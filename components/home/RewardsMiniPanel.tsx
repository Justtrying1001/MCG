import Link from "next/link";
import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";

const ITEMS = [
  { title: "Complete 1 social quest", reward: "+150 points", tone: "open" as const },
  { title: "Reach 40% collection", reward: "Milestone badge", tone: "live" as const },
  { title: "Enter 3 battles", reward: "+300 points", tone: "locked" as const },
];

export function RewardsMiniPanel() {
  return (
    <Surface>
      <div className="mcg-home-section">
        <SectionHeader
          eyebrow="Quests"
          title="What to do now"
          subtitle="Quick wins to keep your loop running."
          actions={<Link href="/rewards" className="mcg-btn ghost">View quests</Link>}
        />
        <div className="mcg-rewards-list">
          {ITEMS.map((item) => (
            <div key={item.title} className="mcg-reward-row">
              <div>
                <strong>{item.title}</strong>
                <div className="mcg-subtitle mcg-reward-subtitle">{item.reward}</div>
              </div>
              <StatusBadge tone={item.tone} label={item.tone.toUpperCase()} />
            </div>
          ))}
        </div>
      </div>
    </Surface>
  );
}
