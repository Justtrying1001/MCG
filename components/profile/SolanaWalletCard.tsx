"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useLinkAccount, usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/components/useSession";

type LinkState = {
  kind: "idle" | "success" | "error";
  message: string | null;
};

async function assertSuccessfulLink(response: Response, fallbackMessage: string) {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error || fallbackMessage);
  }
}

export function SolanaWalletCard() {
  const { me, refresh } = useSession();
  const { authenticated, getAccessToken, ready } = usePrivy();
  const linkedWallets = me?.linkedWallets.solanaWallets ?? [];
  const linkedTwitter = me?.linkedSocials.twitter ?? null;
  const hasWallet = linkedWallets.length > 0;
  const hasTwitter = Boolean(linkedTwitter);
  const [isLinkingWallet, setIsLinkingWallet] = useState(false);
  const [isLinkingTwitter, setIsLinkingTwitter] = useState(false);
  const [linkState, setLinkState] = useState<LinkState>({ kind: "idle", message: null });
  const pendingLinkTypeRef = useRef<"wallet" | "twitter" | null>(null);

  const syncLinkedIdentity = useCallback(async (route: string, fallbackMessage: string) => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error("Privy access token unavailable after identity link");
    }

    const response = await fetch(route, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    });

    await assertSuccessfulLink(response, fallbackMessage);
    await refresh();
  }, [getAccessToken, refresh]);

  const { linkWallet, linkTwitter } = useLinkAccount({
    onSuccess: () => {
      void (async () => {
        const pendingLinkType = pendingLinkTypeRef.current;
        if (!pendingLinkType) return;

        try {
          if (pendingLinkType === "wallet") {
            await syncLinkedIdentity("/api/auth/privy/link-wallet", "Wallet linking failed");
            setLinkState({ kind: "success", message: "Solana wallet linked successfully." });
          } else {
            await syncLinkedIdentity("/api/auth/privy/link-twitter", "Twitter linking failed");
            setLinkState({ kind: "success", message: "Twitter account linked successfully." });
          }
        } catch (error) {
          setLinkState({
            kind: "error",
            message: error instanceof Error ? error.message : "Unable to persist linked identity.",
          });
        } finally {
          pendingLinkTypeRef.current = null;
          setIsLinkingWallet(false);
          setIsLinkingTwitter(false);
        }
      })();
    },
    onError: (error) => {
      pendingLinkTypeRef.current = null;
      setIsLinkingWallet(false);
      setIsLinkingTwitter(false);
      const message = error instanceof Error ? error.message : "Identity link cancelled or failed.";
      setLinkState({ kind: "error", message });
    },
  });

  const primaryWallet = linkedWallets[0] ?? null;
  const primaryWalletShort = useMemo(() => {
    if (!primaryWallet) return null;
    return `${primaryWallet.address.slice(0, 4)}…${primaryWallet.address.slice(-4)}`;
  }, [primaryWallet]);

  const handleLinkWallet = useCallback(() => {
    if (!ready || !authenticated || isLinkingWallet || isLinkingTwitter) return;
    setLinkState({ kind: "idle", message: null });
    pendingLinkTypeRef.current = "wallet";
    setIsLinkingWallet(true);
    linkWallet({
      walletChainType: "solana-only",
      walletList: ["phantom", "solflare", "backpack", "wallet_connect"],
      description: "Link a Solana wallet to your MCG account.",
    });
  }, [authenticated, isLinkingTwitter, isLinkingWallet, linkWallet, ready]);

  const handleLinkTwitter = useCallback(() => {
    if (!ready || !authenticated || isLinkingWallet || isLinkingTwitter) return;
    setLinkState({ kind: "idle", message: null });
    pendingLinkTypeRef.current = "twitter";
    setIsLinkingTwitter(true);
    linkTwitter();
  }, [authenticated, isLinkingTwitter, isLinkingWallet, linkTwitter, ready]);

  return (
    <section className="mcg-surface profile-wallet-card">
      <div className="profile-wallet-card__header">
        <div>
          <p className="mcg-eyebrow">Identity links</p>
          <h3>Connect accounts</h3>
        </div>
        <span className={`profile-wallet-badge ${hasWallet && hasTwitter ? "is-linked" : "is-empty"}`}>
          {hasWallet && hasTwitter ? "all linked" : "link available"}
        </span>
      </div>

      <p className="profile-wallet-card__copy">
        Sign in with either X or a Solana wallet at entry, then link the missing identity here for the full MCG profile.
      </p>

      <div className="profile-identity-grid">
        <div className="profile-identity-item">
          <div>
            <p className="mcg-eyebrow">Twitter / X</p>
            <strong>{hasTwitter ? `@${linkedTwitter?.username || linkedTwitter?.providerUserId}` : "No X account linked"}</strong>
          </div>
          <Button
            variant={hasTwitter ? "ghost" : "primary"}
            className="btn-sm"
            disabled={!ready || !authenticated || hasTwitter || isLinkingTwitter || isLinkingWallet}
            onClick={handleLinkTwitter}
          >
            {isLinkingTwitter ? "Linking X…" : hasTwitter ? "X linked" : "Link X"}
          </Button>
        </div>

        <div className="profile-identity-item">
          <div>
            <p className="mcg-eyebrow">Solana wallet</p>
            {primaryWallet ? (
              <>
                <strong>{primaryWalletShort}</strong>
                <span>{primaryWallet.address}</span>
              </>
            ) : (
              <strong>No Solana wallet linked</strong>
            )}
          </div>
          <Button
            variant={hasWallet ? "ghost" : "primary"}
            className="btn-sm"
            disabled={!ready || !authenticated || isLinkingWallet || isLinkingTwitter}
            onClick={handleLinkWallet}
          >
            {isLinkingWallet ? "Linking wallet…" : hasWallet ? "Link another wallet" : "Link Solana wallet"}
          </Button>
        </div>
      </div>

      {linkState.message ? (
        <p className={`profile-wallet-card__feedback ${linkState.kind === "error" ? "is-error" : "is-success"}`}>
          {linkState.message}
        </p>
      ) : null}
    </section>
  );
}
