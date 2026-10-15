"use client";

import { useEffect, useState } from "react";
import {
  isKeplrInstalled,
  isPrivyEnabled,
  KEPLR_INSTALL_URL,
  useAuth,
  type LinkedAccount,
} from "@oncyberio/studio";

const TYPE_LABEL: Record<LinkedAccount["type"], string> = {
  keplr: "Keplr",
  email: "Email",
  wallet: "Wallet",
  social: "Social",
  other: "Other",
};

function shorten(value: string): string {
  return value.length <= 16 ? value : `${value.slice(0, 10)}…${value.slice(-4)}`;
}

/** Keplr injects `window.keplr` late on some pages, so look again after load. */
function useKeplrInstalled(): boolean {
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const check = () => setInstalled(isKeplrInstalled());
    check();
    window.addEventListener("load", check);
    return () => window.removeEventListener("load", check);
  }, []);

  return installed;
}

function Button({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-4 py-2 text-sm border transition-colors disabled:opacity-50 disabled:cursor-wait ${
        primary
          ? "bg-white text-black border-white hover:bg-white/90"
          : "bg-black/60 text-white/90 border-white/15 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Sign in (Keplr or Privy's options) and manage the login methods on the
 * account. One account, many ways in: a Keplr-created account can add an email
 * or EVM wallet, and an email account can add Keplr.
 */
export function AccountPanel() {
  const auth = useAuth();
  const keplrInstalled = useKeplrInstalled();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isPrivyEnabled() || !auth.ready) return null;

  const run = async (action: () => Promise<void> | void) => {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(friendlyError(err));
    }
  };

  const keplrButton = (label: string, action: () => Promise<void>) =>
    keplrInstalled ? (
      <Button onClick={() => run(action)} disabled={auth.keplrPending} primary>
        {auth.keplrPending ? "Check Keplr…" : label}
      </Button>
    ) : (
      <a
        href={KEPLR_INSTALL_URL}
        target="_blank"
        rel="noreferrer"
        className="rounded-full px-4 py-2 text-sm border border-white/15 bg-black/60 text-white/90 hover:bg-white/10"
      >
        Install Keplr
      </a>
    );

  const hasEmail = auth.linkedAccounts.some((a) => a.type === "email");

  return (
    <div
      className="fixed top-4 right-4 z-[60] flex flex-col items-end gap-2 text-white"
      // The start screen behind us starts the game on click.
      onClick={(e) => e.stopPropagation()}
    >
      {auth.isAnonymous ? (
        <div className="flex gap-2">
          {keplrButton("Sign in with Keplr", auth.loginWithKeplr)}
          <Button onClick={() => run(auth.login)}>Other options</Button>
        </div>
      ) : (
        <>
          <Button onClick={() => setOpen((v) => !v)}>
            {auth.user.displayName}
          </Button>

          {open && (
            <div className="w-72 rounded-2xl bg-black/80 backdrop-blur-sm border border-white/10 shadow-lg p-4 flex flex-col gap-3">
              <div className="text-xs uppercase tracking-wide text-white/50">
                Sign-in methods
              </div>

              <ul className="flex flex-col gap-1.5">
                {auth.linkedAccounts.map((account) => (
                  <li
                    key={`${account.type}:${account.label}`}
                    className="flex justify-between gap-3 text-sm"
                  >
                    <span className="text-white/60">{TYPE_LABEL[account.type]}</span>
                    <span className="font-mono text-white/90" title={account.label}>
                      {shorten(account.label)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-2">
                {!auth.cosmosAddress && keplrButton("Add Keplr", auth.linkKeplr)}
                {!hasEmail && <Button onClick={() => run(auth.linkEmail)}>Add email</Button>}
                <Button onClick={() => run(auth.linkWallet)}>Add wallet</Button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  auth.logout();
                }}
                className="self-start text-sm text-white/50 hover:text-white/80"
              >
                Log out
              </button>
            </div>
          )}
        </>
      )}

      {error && (
        <div role="alert" className="max-w-72 rounded-xl bg-red-950/80 border border-red-500/30 px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      )}
    </div>
  );
}

function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  if (/rejected|denied|cancel/i.test(message)) return "Request cancelled in wallet.";
  if (/already.*(linked|associated|exists)/i.test(message)) {
    return "That sign-in method already belongs to another account.";
  }
  return message;
}
