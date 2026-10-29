"use client";

import { useEffect, useRef, useState } from "react";
import {
  isKeplrInstalled,
  isPrivyEnabled,
  KEPLR_INSTALL_URL,
  useAuth,
  type LinkedAccount,
  type SocialProvider,
} from "@oncyberio/studio";
import { useProfile, type Profile } from "@/hooks/use-profile";

const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,20}$/;
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const SOCIALS: { provider: SocialProvider; label: string }[] = [
  { provider: "twitter", label: "X" },
  { provider: "discord", label: "Discord" },
  { provider: "github", label: "GitHub" },
  { provider: "telegram", label: "Telegram" },
];

const ADDRESS_LABEL: Record<string, string> = { keplr: "Cosmos Hub", email: "Email", wallet: "Wallet" };

function shorten(value: string): string {
  if (value.includes("@")) return value.length <= 24 ? value : `${value.slice(0, 18)}…${value.slice(value.indexOf("@"))}`;
  return value.length <= 16 ? value : `${value.slice(0, 8)}…${value.slice(-4)}`;
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

function releasePointer() {
  try {
    document.exitPointerLock();
  } catch {
    // ignore
  }
}

/** Accounts that can be shown as the player's address. */
function addressAccounts(accounts: LinkedAccount[]): LinkedAccount[] {
  return accounts.filter((a) => a.type === "keplr" || a.type === "email" || a.type === "wallet");
}

/**
 * The address shown on the account button: the one picked in the profile, or
 * else what the account was created with (Keplr, email or an external wallet;
 * Privy's built-in wallet only when there's nothing else).
 */
function primaryOf(accounts: LinkedAccount[], chosen: string | null | undefined): LinkedAccount | null {
  const candidates = addressAccounts(accounts);
  const picked = chosen ? candidates.find((a) => a.id === chosen) : undefined;
  if (picked) return picked;
  const ordered = [...candidates].sort(
    (a, b) => Number(!!a.embedded) - Number(!!b.embedded) || (a.linkedAt ?? Infinity) - (b.linkedAt ?? Infinity),
  );
  return ordered[0] ?? null;
}

function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  if (/rejected|denied|cancel|closed/i.test(message)) return "Cancelled.";
  if (/already.*(linked|associated|exists)/i.test(message)) {
    return "That account already belongs to another player.";
  }
  if (/not (enabled|allowed)|disabled/i.test(message)) {
    return "That sign-in method isn't enabled for this world yet.";
  }
  return message;
}

/**
 * "Log in" when signed out (pick Privy or Cosmos Hub), else the player's
 * picture, username and primary address, opening their profile. Pinned top
 * right in the game; `inline` sits in a toolbar, sized like the studio's buttons.
 */
export function AccountPanel({ placement = "fixed" }: { placement?: "fixed" | "inline" }) {
  const auth = useAuth();
  const { profile, save, uploadAvatar } = useProfile();
  const [modal, setModal] = useState<"login" | "profile" | null>(null);

  // Signing in closes the login choice; signing out closes the profile.
  useEffect(() => {
    if (auth.isAnonymous && modal === "profile") setModal(null);
    if (!auth.isAnonymous && modal === "login") setModal(null);
  }, [auth.isAnonymous, modal]);

  // Without Privy nobody can sign in. Local dev still shows the button, to say what's missing.
  if (!auth.ready || (!isPrivyEnabled() && process.env.NODE_ENV === "production")) return null;

  const open = (which: "login" | "profile") => {
    releasePointer();
    setModal(which);
  };

  const primary = primaryOf(auth.linkedAccounts, profile?.primary);
  const name = profile?.username || auth.user.displayName || "Player";
  const inline = placement === "inline";

  return (
    <>
      <div
        className={inline ? "text-white" : "fixed right-4 top-4 z-[60] text-white"}
        // The start screen behind us starts the game on click.
        onClick={(e) => e.stopPropagation()}
      >
        {auth.isAnonymous ? (
          <button
            type="button"
            onClick={() => open("login")}
            className={`rounded-full border border-white bg-white px-5 text-sm font-semibold text-black hover:bg-white/90 ${inline ? "h-[42px] rounded-xl" : "py-2"}`}
          >
            Log in
          </button>
        ) : (
          <button
            type="button"
            onClick={() => open("profile")}
            className={`flex items-center gap-2.5 border border-white/15 bg-black/60 py-1 pl-1 pr-4 backdrop-blur-sm hover:bg-white/10 ${inline ? "h-[42px] rounded-xl" : "rounded-full"}`}
          >
            <Avatar url={profile?.avatarUrl} seed={auth.user.uid} name={name} size={inline ? 32 : 36} />
            <span className="flex flex-col items-start leading-tight">
              <span className="max-w-[10rem] truncate text-sm font-semibold">{name}</span>
              {primary && (
                <span className="font-mono text-[11px] text-white/55" title={primary.label}>
                  {shorten(primary.label)}
                </span>
              )}
            </span>
          </button>
        )}
      </div>

      {modal === "login" && <LoginModal onClose={() => setModal(null)} />}
      {modal === "profile" && (
        <ProfileModal
          profile={profile}
          primary={primary}
          save={save}
          uploadAvatar={uploadAvatar}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

function Avatar({ url, seed, name, size }: { url?: string | null; seed: string; name: string; size: number }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);

  if (url && !broken) {
    return (
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.42, background: `hsl(${Math.abs(hash) % 360} 55% 42%)` }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

/** Centered dialog. Keys typed in it never reach the game. */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Escape") stop(e);
      }}
      onKeyUp={stop}
      onPointerDown={stop}
      onWheel={stop}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-[rgba(18,19,27,0.97)] text-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="text-white/60 hover:text-white" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-5 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div role="alert" className="rounded-lg border border-red-500/30 bg-red-950/60 px-3 py-2 text-sm text-red-100">
      {error}
    </div>
  );
}

function LoginModal({ onClose }: { onClose: () => void }) {
  const auth = useAuth();
  const keplrInstalled = useKeplrInstalled();
  const [error, setError] = useState<string | null>(null);

  const option = "flex w-full items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-left hover:bg-white/10 disabled:cursor-wait disabled:opacity-60";

  if (!isPrivyEnabled()) {
    return (
      <Modal title="Log in" onClose={onClose}>
        <p className="text-sm text-white/70">
          Sign-in isn't set up for this world. Add <code className="text-white">NEXT_PUBLIC_PRIVY_APP_ID</code> and{" "}
          <code className="text-white">PRIVY_APP_SECRET</code> to <code className="text-white">.env.local</code>, plus
          the Keplr settings from <code className="text-white">.env.example</code> for Cosmos Hub, then restart the dev
          server.
        </p>
      </Modal>
    );
  }

  return (
    <Modal title="Log in" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          className={option}
          onClick={() => {
            // Privy shows its own dialog: get ours out of the way.
            onClose();
            auth.login();
          }}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg font-bold text-black">
            P
          </span>
          <span className="flex flex-col">
            <span className="font-semibold">Privy</span>
            <span className="text-xs text-white/55">Email, Ethereum wallet or socials</span>
          </span>
        </button>

        {keplrInstalled ? (
          <button
            type="button"
            className={option}
            disabled={auth.keplrPending}
            onClick={async () => {
              setError(null);
              try {
                await auth.loginWithKeplr();
              } catch (err) {
                setError(friendlyError(err));
              }
            }}
          >
            <CosmosIcon />
            <span className="flex flex-col">
              <span className="font-semibold">Cosmos Hub</span>
              <span className="text-xs text-white/55">
                {auth.keplrPending ? "Check Keplr to sign…" : "Sign in with your Keplr wallet"}
              </span>
            </span>
          </button>
        ) : (
          <a href={KEPLR_INSTALL_URL} target="_blank" rel="noreferrer" className={option}>
            <CosmosIcon />
            <span className="flex flex-col">
              <span className="font-semibold">Cosmos Hub</span>
              <span className="text-xs text-white/55">Install Keplr to sign in with your Cosmos wallet</span>
            </span>
          </a>
        )}
      </div>
      <ErrorNote error={error} />
    </Modal>
  );
}

function CosmosIcon() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2e3148]">
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="white" strokeWidth="1.4" aria-hidden>
        <circle cx="12" cy="12" r="2.2" fill="white" stroke="none" />
        <ellipse cx="12" cy="12" rx="10" ry="4" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
      </svg>
    </span>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-white/45">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function SmallButton({
  children,
  onClick,
  disabled,
  danger,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`shrink-0 rounded-full border px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
        danger ? "border-red-400/30 text-red-200 hover:bg-red-500/15" : "border-white/15 text-white/90 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function ProfileModal({
  profile,
  primary,
  save,
  uploadAvatar,
  onClose,
}: {
  profile: Profile | null;
  primary: LinkedAccount | null;
  save: (update: Partial<Profile>) => Promise<Profile>;
  uploadAvatar: (file: File) => Promise<Profile>;
  onClose: () => void;
}) {
  const auth = useAuth();
  const keplrInstalled = useKeplrInstalled();
  const fileInput = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState(profile?.username ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => setUsername(profile?.username ?? ""), [profile?.username]);

  const run = async (key: string, action: () => Promise<unknown> | void) => {
    setError(null);
    setBusy(key);
    try {
      await action();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(null);
    }
  };

  const trimmed = username.trim();
  const usernameChanged = trimmed !== (profile?.username ?? "");
  const usernameProblem =
    trimmed && !USERNAME_PATTERN.test(trimmed) ? "3 to 20 letters, numbers, dots, dashes or underscores." : null;
  const name = profile?.username || auth.user.displayName || "Player";

  const socials = auth.linkedAccounts.filter((a) => a.type === "social");
  const addresses = addressAccounts(auth.linkedAccounts);
  const socialPictures = socials.filter((a) => a.avatarUrl && a.avatarUrl !== profile?.avatarUrl);
  const hasEmail = addresses.some((a) => a.type === "email");

  return (
    <Modal title="Profile" onClose={onClose}>
      <div className="flex items-center gap-4">
        <Avatar url={profile?.avatarUrl} seed={auth.user.uid} name={name} size={72} />
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-2">
            <SmallButton onClick={() => fileInput.current?.click()} disabled={!!busy || !profile}>
              {busy === "avatar" ? "Uploading…" : "Upload picture"}
            </SmallButton>
            {profile?.avatarUrl && (
              <SmallButton onClick={() => run("avatar", () => save({ avatarUrl: null }))} disabled={!!busy}>
                Remove
              </SmallButton>
            )}
          </div>
          {socialPictures.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={!!busy}
              onClick={() => run("avatar", () => save({ avatarUrl: a.avatarUrl! }))}
              className="self-start text-xs text-blue-300 hover:text-blue-200"
            >
              Use my {SOCIALS.find((s) => s.provider === a.provider)?.label ?? a.provider} picture
            </button>
          ))}
          <span className="text-[11px] text-white/40">PNG, JPEG, WebP or GIF, up to 2 MB.</span>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (file.size > AVATAR_MAX_BYTES) return setError("Pictures can be up to 2 MB.");
            void run("avatar", () => uploadAvatar(file));
          }}
        />
      </div>

      <Section title="Username" hint={profile?.username ? undefined : "Pick a username so other players know who you are."}>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (usernameProblem || !usernameChanged) return;
            void run("username", async () => {
              await save({ username: trimmed || null });
              setSaved(true);
              setTimeout(() => setSaved(false), 2000);
            });
          }}
        >
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            placeholder={auth.user.displayName ?? "username"}
            spellCheck={false}
            autoComplete="off"
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
          <button
            type="submit"
            disabled={!!busy || !profile || !usernameChanged || !!usernameProblem}
            className="rounded-lg bg-white px-4 text-sm font-semibold text-black disabled:opacity-40"
          >
            {busy === "username" ? "Saving…" : saved ? "Saved" : "Save"}
          </button>
        </form>
        {usernameProblem && <p className="text-xs text-amber-300">{usernameProblem}</p>}
      </Section>

      <Section title="Socials" hint="Linked accounts are verified, so others know they're really yours.">
        <ul className="flex flex-col gap-1.5">
          {SOCIALS.map(({ provider, label }) => {
            const account = socials.find((a) => a.provider === provider);
            return (
              <li key={provider} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm">
                <span className="flex min-w-0 flex-col">
                  <span>{label}</span>
                  {account && <span className="truncate text-xs text-white/55">{account.label}</span>}
                </span>
                {account ? (
                  <SmallButton
                    danger
                    disabled={!!busy || !account.canUnlink}
                    title={account.canUnlink ? undefined : "You need at least one way to sign in."}
                    onClick={() => run(account.id, () => auth.unlink(account))}
                  >
                    {busy === account.id ? "Removing…" : "Remove"}
                  </SmallButton>
                ) : (
                  <SmallButton disabled={!!busy} onClick={() => run(provider, () => auth.linkSocial(provider))}>
                    Connect
                  </SmallButton>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Wallets & email" hint="Sign in with any of these. The selected one shows next to your name.">
        <ul className="flex flex-col gap-1.5">
          {addresses.map((account) => {
            const selected = primary?.id === account.id;
            return (
              <li key={account.id} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm">
                <input
                  type="radio"
                  name="primary"
                  checked={selected}
                  disabled={!!busy || !profile}
                  onChange={() => run("primary", () => save({ primary: account.id }))}
                  aria-label={`Show ${account.label} as my address`}
                  className="accent-blue-500"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-xs text-white/55">
                    {ADDRESS_LABEL[account.type]}
                    {account.embedded && " · built in"}
                  </span>
                  <span className="truncate font-mono text-[13px]" title={account.label}>
                    {account.type === "email" ? account.label : shorten(account.label)}
                  </span>
                </span>
                {account.canUnlink && (
                  <SmallButton danger disabled={!!busy} onClick={() => run(account.id, () => auth.unlink(account))}>
                    {busy === account.id ? "Removing…" : "Remove"}
                  </SmallButton>
                )}
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap gap-2">
          {!hasEmail && (
            <SmallButton disabled={!!busy} onClick={() => run("email", () => auth.linkEmail())}>
              Add email
            </SmallButton>
          )}
          <SmallButton disabled={!!busy} onClick={() => run("wallet", () => auth.linkWallet())}>
            Add Ethereum wallet
          </SmallButton>
          {!auth.cosmosAddress &&
            (keplrInstalled ? (
              <SmallButton disabled={!!busy || auth.keplrPending} onClick={() => run("keplr", auth.linkKeplr)}>
                {auth.keplrPending ? "Check Keplr…" : "Add Cosmos Hub (Keplr)"}
              </SmallButton>
            ) : (
              <a
                href={KEPLR_INSTALL_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/90 hover:bg-white/10"
              >
                Install Keplr
              </a>
            ))}
        </div>
      </Section>

      <ErrorNote error={error} />

      <button
        type="button"
        onClick={() => {
          onClose();
          auth.logout();
        }}
        className="self-start text-sm text-white/50 hover:text-white/80"
      >
        Log out
      </button>
    </Modal>
  );
}
