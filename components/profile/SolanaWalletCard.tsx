"use client";

import { useCallback, useMemo, useState } from "react";
import { useLinkAccount, usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/components/useSession";

type LinkState = {
  kind: "idle" | "success" | "error";
  message: string | null;
};

export function SolanaWalletCard() {
  const { me, refresh } = useSession();
  const { authenticated, getAccessToken, ready } = usePrivy();
  const linkedWallets = me?.linkedWallets.solanaWallets ?? [];
  const hasWallet = linkedWallets.length > 0;
  const [isLinking, setIsLinking] = useState(false);
  const [linkState, setLinkState] = useState<LinkState>({ kind: "idle", message: null });

  const syncWalletLink = useCallback(async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error("Privy access token unavailable after wallet link");
    }

    const response = await fetch("/api/auth/privy/link-wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      throw new Error(payload?.error || "Wallet linking failed");
    }

    await refresh();
  }, [getAccessToken, refresh]);

  const { linkWallet } = useLinkAccount({
    onSuccess: () => {
      void (async () => {
        setIsLinking(true);
        try {
          await syncWalletLink();
          setLinkState({ kind: "success", message: "Solana wallet linked successfully." });
        } catch (error) {
          setLinkState({
            kind: "error",
            message: error instanceof Error ? error.message : "Unable to persist linked wallet.",
          });
        } finally {
          setIsLinking(false);
        }
      })();
    },
    onError: (error) => {
      setIsLinking(false);
      const message = error instanceof Error ? error.message : "Wallet link cancelled or failed.";
      setLinkState({ kind: "error", message });
    },
  });

  const primaryWallet = linkedWallets[0] ?? null;
  const primaryWalletShort = useMemo(() => {
    if (!primaryWallet) return null;
    return `${primaryWallet.address.slice(0, 4)}…${primaryWallet.address.slice(-4)}`;
  }, [primaryWallet]);

  const handleLinkWallet = useCallback(() => {
    if (!ready || !authenticated || isLinking) return;
    setLinkState({ kind: "idle", message: null });
    setIsLinking(true);
    linkWallet({
      walletChainType: "solana-only",
      walletList: ["phantom", "solflare", "backpack", "wallet_connect"],
      description: "Link a Solana wallet to your existing MCG profile.",
    });
  }, [authenticated, isLinking, linkWallet, ready]);

  return (
    <section className="mcg-surface profile-wallet-card">
      <div className="profile-wallet-card__header">
        <div>
          <p className="mcg-eyebrow">Solana wallet</p>
          <h3>Connect wallet</h3>
        </div>
        <span className={`profile-wallet-badge ${hasWallet ? "is-linked" : "is-empty"}`}>
          {hasWallet ? "wallet linked" : "no wallet linked"}
        </span>
      </div>

      <p className="profile-wallet-card__copy">
        Link an external Solana wallet to prepare token-gating and holder checks, without changing your X login.
      </p>

      {primaryWallet ? (
        <div className="profile-wallet-card__address">
          <strong>{primaryWalletShort}</strong>
          <span>{primaryWallet.address}</span>
        </div>
      ) : (
        <p className="profile-wallet-card__empty">No Solana wallet linked to this MCG account yet.</p>
      )}

      <div className="profile-wallet-card__actions">
        <Button
          variant={hasWallet ? "ghost" : "primary"}
          className="btn-sm"
          disabled={!ready || !authenticated || isLinking}
          onClick={handleLinkWallet}
        >
          {isLinking ? "Linking wallet…" : hasWallet ? "Link another Solana wallet" : "Connect Solana wallet"}
        </Button>
      </div>

      {linkState.message ? (
        <p className={`profile-wallet-card__feedback ${linkState.kind === "error" ? "is-error" : "is-success"}`}>
          {linkState.message}
        </p>
      ) : null}
    </section>
  );
}
