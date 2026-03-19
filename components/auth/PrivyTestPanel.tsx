"use client";

import { useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const privyClientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;

export function PrivyTestPanel() {
  if (!privyAppId) {
    return (
      <section className="privy-test-panel" aria-live="polite">
        <div>
          <p className="privy-test-panel__eyebrow">Privy frontend check</p>
          <p className="privy-test-panel__title">Privy disabled</p>
          <p className="privy-test-panel__copy">Set <code>NEXT_PUBLIC_PRIVY_APP_ID</code> to enable this temporary validation panel.</p>
        </div>
      </section>
    );
  }

  if (!privyClientId) {
    return (
      <section className="privy-test-panel" aria-live="polite">
        <div>
          <p className="privy-test-panel__eyebrow">Privy frontend check</p>
          <p className="privy-test-panel__title">Privy client missing</p>
          <p className="privy-test-panel__copy">Set <code>NEXT_PUBLIC_PRIVY_CLIENT_ID</code> alongside <code>NEXT_PUBLIC_PRIVY_APP_ID</code> so the Privy provider can initialize cleanly on preview.</p>
        </div>
      </section>
    );
  }

  return <PrivyTestPanelState />;
}

function PrivyTestPanelState() {
  const { authenticated, login, ready, user } = usePrivy();
  const twitterAccount = useMemo(() => user?.linkedAccounts.find((account) => account.type === "twitter_oauth") ?? null, [user]);

  return (
    <section className="privy-test-panel" aria-live="polite">
      <div className="privy-test-panel__body">
        <div>
          <p className="privy-test-panel__eyebrow">Privy frontend check</p>
          <p className="privy-test-panel__title">Temporary validation panel</p>
          <p className="privy-test-panel__copy">Opens the Privy modal with X/Twitter only, without changing the existing MCG session flow.</p>
        </div>

        <div className="privy-test-panel__actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => login({ loginMethods: ["twitter"] })}>
            Open Privy X login
          </button>
        </div>
      </div>

      <dl className="privy-test-panel__grid">
        <div>
          <dt>Provider ready</dt>
          <dd>{ready ? "yes" : "no"}</dd>
        </div>
        <div>
          <dt>Authenticated</dt>
          <dd>{authenticated ? "yes" : "no"}</dd>
        </div>
        <div>
          <dt>Privy user id</dt>
          <dd>{user?.id ?? "—"}</dd>
        </div>
        <div>
          <dt>X account</dt>
          <dd>{twitterAccount ? `${twitterAccount.name ?? "X user"} (${twitterAccount.username ? `@${twitterAccount.username}` : "no username"})` : "—"}</dd>
        </div>
      </dl>
    </section>
  );
}
