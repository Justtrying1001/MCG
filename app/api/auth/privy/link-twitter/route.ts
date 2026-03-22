export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { resolveSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IdentityConflictError, IdentityLinkingError, linkTwitterIdentityToExistingUser } from "@/lib/domain/rewards/onboarding";
import { logAuthEvent } from "@/lib/observability/auth-log";
import { resolvePrivyIdentityFromAccessToken } from "@/lib/privy-auth";
import { enforceSameOrigin } from "@/lib/csrf";

type LinkTwitterRequestBody = {
  accessToken?: string;
};

export async function POST(request: Request) {
  const sameOriginError = enforceSameOrigin(request);
  if (sameOriginError) return sameOriginError;

  const url = new URL(request.url);
  const session = await resolveSessionUser();

  if (!session.ok) {
    logAuthEvent("privy_link_twitter_unauthorized", "warn", {
      reason: session.reason,
      requestHost: url.host,
    });
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as LinkTwitterRequestBody | null;
    const accessToken = body?.accessToken?.trim();

    if (!accessToken) {
      return NextResponse.json({ ok: false, error: "Missing access token" }, { status: 400 });
    }

    const profile = await resolvePrivyIdentityFromAccessToken(accessToken);
    const linkedTwitter = await prisma.$transaction((tx) => linkTwitterIdentityToExistingUser(tx, {
      userId: session.user.id,
      profile: {
        privyUserId: profile.privyUserId,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        identities: profile.identities,
      },
    }));

    logAuthEvent("privy_link_twitter_succeeded", "info", {
      requestHost: url.host,
      userId: session.user.id,
      privyUserId: profile.privyUserId,
      linkedTwitterCount: linkedTwitter.length,
    });

    return NextResponse.json({
      ok: true,
      linkedIdentities: linkedTwitter.map((identity) => ({
        provider: identity.provider,
        providerUserId: identity.providerUserId,
        username: identity.username,
      })),
    });
  } catch (error) {
    if (error instanceof IdentityConflictError) {
      logAuthEvent("privy_link_twitter_conflict", "warn", {
        requestHost: url.host,
        userId: session.user.id,
        errorMessage: error.message,
        conflictProviders: error.conflictProviders.join(","),
      });
      return NextResponse.json({ ok: false, error: "Twitter account already linked to another user" }, { status: 409 });
    }

    if (error instanceof IdentityLinkingError) {
      logAuthEvent("privy_link_twitter_rejected", "warn", {
        requestHost: url.host,
        userId: session.user.id,
        errorMessage: error.message,
      });
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    logAuthEvent("privy_link_twitter_failed", "error", {
      requestHost: url.host,
      userId: session.user.id,
      errorName: error instanceof Error ? error.name : "unknown",
      errorMessage: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false, error: "Twitter linking failed" }, { status: 500 });
  }
}
