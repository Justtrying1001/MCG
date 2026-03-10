import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getAdminSessionFromCookies } from "@/lib/admin-auth";

export default function AdminProtectedLayout({ children }: { children: ReactNode }) {
  const session = getAdminSessionFromCookies();
  if (!session) {
    redirect("/admin/login");
  }

  return children;
}
