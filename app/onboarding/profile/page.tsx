"use client";

import { SiteShell } from "@/components/layout/SiteShell";
import { HandleOnboardingForm } from "@/components/profile/HandleOnboardingForm";

export default function ProfileOnboardingPage() {
  return (
    <SiteShell>
      <HandleOnboardingForm />
    </SiteShell>
  );
}
