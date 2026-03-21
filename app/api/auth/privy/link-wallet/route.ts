export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { resolveSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IdentityConflictError, IdentityLinkingError, linkWalletIdentitiesToExistingUser } from "@/lib/domain/rewards/onboarding";
import { logAuthEvent } from "@/lib/observability/auth-log";
import { resolvePrivyIdentityFromAccessToken } from "@/lib/privy-auth";
import { enforceSameOrigin } from "@/lib/csrf";

type LinkWalletRequestBody = {
  accessToken?: string;
};

export async function POST(request: Request) {
  const sameOriginError = enforceSameOrigin(request);
  if (sameOriginError) return sameOriginError;

  const url = new URL(request.url);
  const session = await resolveSessionUser();

  if (!session.ok) {
    logAuthEvent("privy_link_wallet_unauthorized", "warn", {
      reason: session.reason,
      requestHost: url.host,
    });
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as LinkWalletRequestBody | null;
    const accessToken = body?.accessToken?.trim();

    if (!accessToken) {
      return NextResponse.json({ ok: false, error: "Missing access token" }, { status: 400 });
    }

    const profile = await resolvePrivyIdentityFromAccessToken(accessToken);
    const linkedWallets = await prisma.$transaction((tx) => linkWalletIdentitiesToExistingUser(tx, {
      userId: session.user.id,
      profile: {
        privyUserId: profile.privyUserId,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        identities: profile.identities,
      },
    }));

    logAuthEvent("privy_link_wallet_succeeded", "info", {
      requestHost: url.host,
      userId: session.user.id,
      privyUserId: profile.privyUserId,
      walletCount: linkedWallets.length,
    });

    return NextResponse.json({
      ok: true,
      linkedWallets: linkedWallets.map((wallet) => ({
        provider: wallet.provider,
        address: wallet.walletAddress ?? wallet.providerUserId,
        providerUserId: wallet.providerUserId,
      })),
    });
  } catch (error) {
    if (error instanceof IdentityConflictError) {
      logAuthEvent("privy_link_wallet_conflict", "warn", {
        requestHost: url.host,
        userId: session.user.id,
        errorMessage: error.message,
        conflictProviders: error.conflictProviders.join(","),
      });
      return NextResponse.json({ ok: false, error: "Wallet already linked to another user" }, { status: 409 });
    }

    if (error instanceof IdentityLinkingError) {
      logAuthEvent("privy_link_wallet_rejected", "warn", {
        requestHost: url.host,
        userId: session.user.id,
        errorMessage: error.message,
      });
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    logAuthEvent("privy_link_wallet_failed", "error", {
      requestHost: url.host,
      userId: session.user.id,
      errorName: error instanceof Error ? error.name : "unknown",
      errorMessage: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false, error: "Wallet linking failed" }, { status: 500 });
  }
}
