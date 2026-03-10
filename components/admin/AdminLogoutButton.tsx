"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";

export function AdminLogoutButton() {
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <Button variant="ghost" className="btn-sm" onClick={() => void logout()}>
      Admin logout
    </Button>
  );
}
