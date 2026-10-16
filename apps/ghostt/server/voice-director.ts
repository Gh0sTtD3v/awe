import {
  computeVoicePairs,
  pairKey,
  peersOf,
  samePeers,
  type VoiceMember,
  type VoicePeer,
} from "../shared/voice";

/**
 * Who in one room should hold a voice connection to whom. The room feeds it
 * the players in voice; it hands back the peer lists that changed.
 */
export class VoiceDirector {
  private pairs = new Set<string>();
  private sent = new Map<string, VoicePeer[]>();

  /**
   * Recompute pairs from positions. Returns, per session, its new peer list —
   * only for sessions whose list changed (including ones that left voice, who
   * get an empty list).
   */
  update(members: VoiceMember[], canSpeak: (sessionId: string) => boolean): Map<string, VoicePeer[]> {
    this.pairs = computeVoicePairs(members, this.pairs);

    const changed = new Map<string, VoicePeer[]>();
    const present = new Set(members.map((m) => m.sessionId));

    for (const m of members) {
      const peers = peersOf(m.sessionId, this.pairs, canSpeak);
      if (!samePeers(this.sent.get(m.sessionId), peers)) {
        this.sent.set(m.sessionId, peers);
        changed.set(m.sessionId, peers);
      }
    }
    for (const id of [...this.sent.keys()]) {
      if (present.has(id)) continue;
      this.sent.delete(id);
      changed.set(id, []);
    }
    return changed;
  }

  /** May `from` send handshake messages to `to`? Only while they're paired. */
  connected(from: string, to: string): boolean {
    return from !== to && this.pairs.has(pairKey(from, to));
  }

  remove(sessionId: string): void {
    this.sent.delete(sessionId);
    for (const key of [...this.pairs]) {
      if (key.split("|").includes(sessionId)) this.pairs.delete(key);
    }
  }
}
