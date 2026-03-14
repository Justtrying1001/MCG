import { redirect } from "next/navigation";

export default function LegacyContestsRedirectPage() {
  redirect("/admin/contests");
}
