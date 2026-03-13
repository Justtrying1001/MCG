import { formatDate } from "@/components/contests/contestUtils";
import type { ContestStatus } from "@/components/contests/types";

type Props = {
  code: string;
  title: string;
  status: ContestStatus;
  startsAt: string | null;
  lockAt: string | null;
  endsAt: string | null;
  rosterSize: number;
  restrictedSet: boolean;
  entries: number;
};

export function ContestHero(props: Props) {
  return (
    <section className="contest-hero">
      <div>
        <p className="contest-code">{props.code}</p>
        <h2 className="contest-hero-title">{props.title}</h2>
        <p className="contest-inline-note">Draft your lineup before lock and climb the ranking in real time.</p>
      </div>
      <div className="contest-hero-badges">
        <span className={`contest-status status-${props.status.toLowerCase()}`}>{props.status}</span>
        <span className="contest-reward-chip">🏆 {Math.max(100, props.rosterSize * 40)} pts</span>
      </div>
      <div className="contest-meta-grid">
        <HeroMeta label="Entries" value={String(props.entries)} />
        <HeroMeta label="Roster" value={String(props.rosterSize)} />
        <HeroMeta label="Starts" value={formatDate(props.startsAt)} />
        <HeroMeta label="Lock" value={formatDate(props.lockAt)} />
        <HeroMeta label="Ends" value={formatDate(props.endsAt)} />
        <HeroMeta label="Set" value={props.restrictedSet ? "Restricted" : "Any"} />
      </div>
    </section>
  );
}

function HeroMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="contest-meta-label">{label}</p>
      <p className="contest-meta-value">{value}</p>
    </div>
  );
}
