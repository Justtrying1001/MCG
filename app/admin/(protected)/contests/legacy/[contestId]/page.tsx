import { redirect } from "next/navigation";

export default function LegacyContestDetailRedirectPage({ params }: { params: { contestId: string } }) {
  redirect(`/admin/contests/${params.contestId}`);
}
