"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLinkAccount, usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/components/useSession";

type LinkState = {
  kind: "idle" | "success" | "error";
  message: string | null;
};

function normalizeHandleInput(value: string) {
  return value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
}

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
  const [isSavingHandle, setIsSavingHandle] = useState(false);
  const [handleInput, setHandleInput] = useState(me?.user.handle ?? "");
  const [handleMessage, setHandleMessage] = useState<LinkState>({ kind: "idle", message: null });
  const [linkState, setLinkState] = useState<LinkState>({ kind: "idle", message: null });
  const pendingLinkTypeRef = useRef<"wallet" | "twitter" | null>(null);

  useEffect(() => {
    setHandleInput(me?.user.handle ?? "");
  }, [me?.user.handle]);

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
            setLinkState({ kind: "success", message: "X account linked successfully." });
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
  const normalizedHandle = useMemo(() => normalizeHandleInput(handleInput), [handleInput]);
  const currentHandle = me?.user.handle ?? null;
  const handleDirty = normalizedHandle !== (currentHandle ?? "");

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

  const handleSave = useCallback(async () => {
    if (!normalizedHandle || isSavingHandle || !handleDirty) return;
    setIsSavingHandle(true);
    setHandleMessage({ kind: "idle", message: null });

    try {
      const response = await fetch("/api/me/handle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: normalizedHandle }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setHandleMessage({ kind: "error", message: payload?.error || "Unable to save username." });
        return;
      }

      await refresh();
      setHandleMessage({
        kind: "success",
        message: currentHandle ? "Username updated successfully." : "Username saved successfully.",
      });
    } finally {
      setIsSavingHandle(false);
    }
  }, [currentHandle, handleDirty, isSavingHandle, normalizedHandle, refresh]);

  return (
    <section className="mcg-surface profile-wallet-card profile-account-settings-card">
      <div className="profile-wallet-card__header profile-header-stack">
        <div className="profile-header-stack__top-row">
          <p className="mcg-eyebrow">Account settings</p>
          <span className={`profile-wallet-badge ${hasWallet && hasTwitter ? "is-linked" : "is-empty"}`}>
            {hasWallet && hasTwitter ? "fully linked" : "setup available"}
          </span>
        </div>
        <h3>Username & connections</h3>
      </div>

      <div className="profile-settings-section">
        <div className="profile-settings-section__header profile-header-stack">
          <div className="profile-header-stack__top-row">
            <p className="mcg-eyebrow">App username</p>
            <span className={`profile-status-pill ${currentHandle ? "is-linked" : "is-missing"}`}>
              {currentHandle ? "set" : "choose one"}
            </span>
          </div>
          <strong>{currentHandle ? `@${currentHandle}` : "Username required"}</strong>
        </div>

        <label className="profile-handle-field">
          <span>{currentHandle ? "Change username" : "Choose username"}</span>
          <input
            value={handleInput}
            onChange={(event) => setHandleInput(normalizeHandleInput(event.target.value))}
            placeholder="your_handle"
            maxLength={20}
          />
        </label>

        <p className="profile-handle-preview">
          Preview: <strong>{normalizedHandle ? `@${normalizedHandle}` : "@your_handle"}</strong>
        </p>

        <div className="profile-settings-actions">
          <Button
            className="btn-sm"
            disabled={!normalizedHandle || isSavingHandle || !handleDirty}
            onClick={() => void handleSave()}
          >
            {isSavingHandle ? "Saving…" : currentHandle ? "Update username" : "Save username"}
          </Button>
        </div>

        {handleMessage.message ? (
          <p className={`profile-wallet-card__feedback ${handleMessage.kind === "error" ? "is-error" : "is-success"}`}>
            {handleMessage.message}
          </p>
        ) : null}
      </div>

      <div className="profile-settings-section">
        <div className="profile-settings-section__header profile-header-stack profile-settings-section__heading">
          <div className="profile-header-stack__top-row">
            <p className="mcg-eyebrow">Connections</p>
          </div>
          <strong>Linked accounts</strong>
          <p className="profile-settings-section__helper">Manage the accounts linked to your profile.</p>
        </div>

        <div className="profile-identity-grid">
          <div className="profile-identity-item">
            <div className="profile-identity-item__content">
              <div className="profile-identity-item__row profile-identity-item__topline">
                <p className="mcg-eyebrow">X connection</p>
                <div className="profile-identity-item__actions">
                  <Button
                    variant={hasTwitter ? "ghost" : "primary"}
                    className="btn-sm"
                    disabled={!ready || !authenticated || isLinkingTwitter || isLinkingWallet}
                    onClick={handleLinkTwitter}
                  >
                    {isLinkingTwitter ? "LINKING X…" : hasTwitter ? "CHANGE X ACCOUNT" : "LINK X ACCOUNT"}
                  </Button>
                </div>
              </div>
              <span className={`profile-status-pill profile-identity-item__row ${hasTwitter ? "is-linked" : "is-missing"}`}>
                {hasTwitter ? "LINKED" : "UNLINKED"}
              </span>
              <strong className="profile-identity-item__main-value">
                {hasTwitter ? `@${linkedTwitter?.username || linkedTwitter?.providerUserId}` : "X not linked"}
              </strong>
              <span className="profile-identity-item__helper">
                {hasTwitter
                  ? "This X account is currently linked to your profile."
                  : "Link an X account to connect your social identity."}
              </span>
            </div>
          </div>

          <div className="profile-identity-item">
            <div className="profile-identity-item__content">
              <div className="profile-identity-item__row profile-identity-item__topline">
                <p className="mcg-eyebrow">Wallet connection</p>
                <div className="profile-identity-item__actions">
                  <Button
                    variant={hasWallet ? "ghost" : "primary"}
                    className="btn-sm"
                    disabled={!ready || !authenticated || isLinkingWallet || isLinkingTwitter}
                    onClick={handleLinkWallet}
                  >
                    {isLinkingWallet ? "LINKING WALLET…" : hasWallet ? "CHANGE WALLET" : "LINK WALLET"}
                  </Button>
                </div>
              </div>
              <span className={`profile-status-pill profile-identity-item__row ${hasWallet ? "is-linked" : "is-missing"}`}>
                {hasWallet ? "LINKED" : "UNLINKED"}
              </span>
              {primaryWallet ? (
                <>
                  <strong className="profile-identity-item__main-value">{primaryWalletShort}</strong>
                  <span className="profile-identity-item__helper profile-identity-item__helper--wallet">
                    Connected wallet: {primaryWallet.address}
                  </span>
                </>
              ) : (
                <>
                  <strong className="profile-identity-item__main-value">Wallet not linked</strong>
                  <span className="profile-identity-item__helper">Link a Solana wallet to complete your account setup.</span>
                </>
              )}
            </div>
          </div>
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
