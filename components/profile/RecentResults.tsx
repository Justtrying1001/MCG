import Link from "next/link";
import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";

type ResultRow = {
  contestId: string;
  contestTitle: string;
  rank: number;
  rankedAt: string;
};

export function RecentResults({ results }: { results: ResultRow[] }) {
  return (
    <Surface>
      <div className="profile-results-wrap">
        <SectionHeader
          eyebrow="Recent results"
          title="Latest contest finishes"
          subtitle="Compact history of your latest rankings."
        />

        <div className="profile-results-list">
          {results.map((result) => (
            <div key={`${result.contestId}-${result.rankedAt}`} className="profile-result-row">
              <span className="profile-result-rank">#{result.rank}</span>
              <div>
                <strong>{result.contestTitle}</strong>
                <p className="contest-inline-note">{new Date(result.rankedAt).toLocaleDateString()}</p>
              </div>
              <Link href={`/contests/${result.contestId}`} className="mcg-btn ghost">View</Link>
            </div>
          ))}
        </div>
      </div>
    </Surface>
  );
}
