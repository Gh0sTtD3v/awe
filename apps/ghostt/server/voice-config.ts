import crypto from "node:crypto";
import type { VoiceConfigMessage } from "../shared/messages";

/**
 * ICE servers handed to each client for voice chat.
 *
 * - STUN (`AWE_STUN_URLS`, comma separated) finds a direct route; Google's
 *   public servers by default.
 * - TURN (`AWE_TURN_URLS`) relays audio for players whose network blocks
 *   direct connections. Either:
 *   - `AWE_TURN_SECRET`: coturn's `use-auth-secret` / `static-auth-secret`.
 *     Each player gets a credential that expires after a day, so nothing
 *     long-lived reaches the browser. Preferred.
 *   - `AWE_TURN_USERNAME` + `AWE_TURN_CREDENTIAL`: fixed credentials, visible
 *     to every player.
 *   Without TURN, players on strict networks can't hear or be heard.
 */

const DEFAULT_STUN = "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302";
const TURN_TTL_SECONDS = 24 * 60 * 60;

function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function voiceConfigFor(sessionId: string, now = Date.now()): VoiceConfigMessage {
  const iceServers: VoiceConfigMessage["iceServers"] = [];

  const stun = list(process.env.AWE_STUN_URLS ?? DEFAULT_STUN);
  if (stun.length) iceServers.push({ urls: stun });

  const turn = list(process.env.AWE_TURN_URLS);
  if (turn.length) {
    const secret = process.env.AWE_TURN_SECRET;
    if (secret) {
      const username = `${Math.floor(now / 1000) + TURN_TTL_SECONDS}:${sessionId}`;
      const credential = crypto.createHmac("sha1", secret).update(username).digest("base64");
      iceServers.push({ urls: turn, username, credential });
    } else if (process.env.AWE_TURN_USERNAME && process.env.AWE_TURN_CREDENTIAL) {
      iceServers.push({
        urls: turn,
        username: process.env.AWE_TURN_USERNAME,
        credential: process.env.AWE_TURN_CREDENTIAL,
      });
    } else {
      console.warn("[Voice] AWE_TURN_URLS is set without AWE_TURN_SECRET or AWE_TURN_USERNAME/AWE_TURN_CREDENTIAL; ignoring it.");
    }
  }

  return { iceServers };
}
