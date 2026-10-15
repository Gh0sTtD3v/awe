/**
 * Lets non-React game code (GameScript, the room connection) get a Privy
 * access token. React owns auth; `<AuthBridge/>` registers the getter here.
 */

type TokenGetter = () => Promise<string | null>;

let getter: TokenGetter | null = null;

export function setAccessTokenGetter(next: TokenGetter | null): void {
  getter = next;
}

/** The current access token, or null when signed out or auth isn't ready. */
export async function getAccessToken(): Promise<string | null> {
  try {
    return (await getter?.()) ?? null;
  } catch {
    return null;
  }
}
