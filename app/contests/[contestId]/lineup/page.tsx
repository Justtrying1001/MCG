import { redirect } from "next/navigation";

export default function ContestLineupBuilderLegacyRedirect({ params }: { params: { contestId: string } }) {
  redirect(`/contests/${params.contestId}?tab=entry`);
}
