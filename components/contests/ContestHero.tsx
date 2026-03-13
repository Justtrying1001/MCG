import { ContestCountdown } from "@/components/contests/ContestCountdown";
import { ContestRewardPreview } from "@/components/contests/ContestRewardPreview";
import { ContestStatusBadge } from "@/components/contests/ContestStatusBadge";
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
  nowTs: number;
};

export function ContestHero(props: Props) {
  return (
    <section className="contest-hero">
      <div>
        <p className="contest-code">{props.code}</p>
        <h2 className="contest-hero-title">{props.title}</h2>
        <p className="contest-inline-note">Build strategically before lock, then track your rank through every phase.</p>
      </div>
      <div className="contest-hero-badges">
        <ContestStatusBadge status={props.status} />
        <span className="contest-reward-chip">Roster size: {props.rosterSize}</span>
      </div>
      <ContestCountdown status={props.status} lockAt={props.lockAt} endsAt={props.endsAt} nowTs={props.nowTs} />
      <div className="contest-meta-grid">
        <HeroMeta label="Entries" value={String(props.entries)} />
        <HeroMeta label="Starts" value={formatDate(props.startsAt)} />
        <HeroMeta label="Lock" value={formatDate(props.lockAt)} />
        <HeroMeta label="Ends" value={formatDate(props.endsAt)} />
        <HeroMeta label="Set" value={props.restrictedSet ? "Restricted" : "Any"} />
      </div>
      <ContestRewardPreview rosterSize={props.rosterSize} entries={props.entries} />
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
