import type { Room } from "@colyseus/sdk";
import { Camera, type Space } from "@oncyberio/engine";
import audioListener from "@oncyberio/engine/internal/utils/globals/audio-listener";
import { PositionalAudio } from "three";
import {
  VOICE_CONFIG_MESSAGE,
  VOICE_JOIN_MESSAGE,
  VOICE_PEERS_MESSAGE,
  VOICE_SIGNAL_MESSAGE,
  type VoiceConfigMessage,
  type VoicePeersMessage,
  type VoiceSignalIn,
  type VoiceSignalOut,
} from "../../shared/messages";
import { VOICE_HEARING_RANGE, type VoicePeer, type VoiceSignal } from "../../shared/voice";
import { setVoiceActivity, setVoicePeers, voiceStore, type VoiceState } from "./voice-store";

const PTT_KEY = "KeyT";
/** RMS above this counts as talking. */
const SPEAKING_THRESHOLD = 0.04;
const ACTIVITY_INTERVAL_MS = 100;
/** Full volume within this distance, fading to silence at VOICE_HEARING_RANGE. */
const VOICE_REF_DISTANCE = 3;

interface Peer {
  info: VoicePeer;
  pc: RTCPeerConnection;
  /** Candidates that arrived before the remote description. */
  pending: RTCIceCandidateInit[];
  stream: MediaStream | null;
  /** Chrome only feeds remote WebRTC audio into Web Audio while a media element plays it. */
  element: HTMLAudioElement | null;
  audio: PositionalAudio | null;
  /** The avatar the voice plays from; replaced when its chunk reloads. */
  avatar: unknown;
  analyser: AnalyserNode | null;
  analyserSource: MediaStreamAudioSourceNode | null;
  makingOffer: boolean;
}

function rms(analyser: AnalyserNode, buffer: Float32Array<ArrayBuffer>): number {
  analyser.getFloatTimeDomainData(buffer);
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  return Math.sqrt(sum / buffer.length);
}

/**
 * Proximity voice over peer-to-peer WebRTC. The server says who to connect
 * to and relays the handshake; audio goes straight between players and plays
 * from each speaker's avatar, fading with distance.
 *
 * Speak is enforced by listeners: a peer the server marks `canSpeak: false`
 * (no permission, or muted by a moderator) is never played, whatever it sends.
 */
export class VoiceClient {
  private iceServers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
  private peers = new Map<string, Peer>();
  private mic: MediaStream | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private pttHeld = false;
  private canSpeak = false;
  private activityTimer: ReturnType<typeof setInterval> | null = null;
  private unsubscribers: (() => void)[] = [];
  private buffer = new Float32Array(512);

  constructor(
    private readonly room: Room<any>,
    private readonly space: Space,
  ) {
    this.listen(
      room.onMessage(VOICE_CONFIG_MESSAGE, (msg: VoiceConfigMessage) => {
        if (msg.iceServers?.length) this.iceServers = msg.iceServers;
      }),
    );
    this.listen(room.onMessage(VOICE_PEERS_MESSAGE, (msg: VoicePeersMessage) => this.setPeers(msg.peers ?? [])));
    this.listen(room.onMessage(VOICE_SIGNAL_MESSAGE, (msg: VoiceSignalIn) => void this.onSignal(msg.from, msg.signal)));

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    this.unsubscribers.push(voiceStore.subscribe(() => this.applyTransmit()));
  }

  private listen(off: unknown) {
    if (typeof off === "function") this.unsubscribers.push(off as () => void);
  }

  private get state(): VoiceState {
    return voiceStore.state;
  }

  // ── Joining ────────────────────────────────────────────────────────────────

  /** Must run from a click: browsers only start audio and ask for the mic after a user gesture. */
  async join(): Promise<void> {
    if (this.state.joined) return;
    void audioListener.context.resume();

    voiceStore.update({ joined: true, mic: this.canSpeak ? "requesting" : "listen-only" });
    this.room.send(VOICE_JOIN_MESSAGE, { on: true });
    this.activityTimer = setInterval(this.tick, ACTIVITY_INTERVAL_MS);

    if (this.canSpeak) await this.startMic();
  }

  leave(): void {
    if (!this.state.joined) return;
    this.room.send(VOICE_JOIN_MESSAGE, { on: false });
    for (const id of [...this.peers.keys()]) this.closePeer(id);
    this.stopMic();
    if (this.activityTimer) clearInterval(this.activityTimer);
    this.activityTimer = null;
    voiceStore.update({ joined: false, mic: "off", transmitting: false, level: 0, speaking: {}, peers: {} });
  }

  /** Our Speak permission, from the server. Gaining it mid-session asks for the mic. */
  setCanSpeak(canSpeak: boolean): void {
    if (this.canSpeak === canSpeak) return;
    this.canSpeak = canSpeak;
    if (!this.state.joined) return;
    if (canSpeak) void this.startMic();
    else {
      this.stopMic();
      voiceStore.update({ mic: "listen-only" });
    }
  }

  private async startMic() {
    if (this.mic) return;
    voiceStore.update({ mic: "requesting" });
    try {
      const mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (!this.state.joined || !this.canSpeak) {
        mic.getTracks().forEach((t) => t.stop());
        return;
      }
      this.mic = mic;
      const ctx = audioListener.context;
      this.micAnalyser = ctx.createAnalyser();
      this.micAnalyser.fftSize = 512;
      ctx.createMediaStreamSource(mic).connect(this.micAnalyser);

      const track = mic.getAudioTracks()[0];
      for (const peer of this.peers.values()) void this.sender(peer)?.replaceTrack(track);
      voiceStore.update({ mic: "ready" });
      this.applyTransmit();
    } catch (err) {
      console.warn("[Voice] Microphone unavailable:", (err as Error).message);
      voiceStore.update({ mic: "denied" });
    }
  }

  private stopMic() {
    this.mic?.getTracks().forEach((t) => t.stop());
    this.mic = null;
    this.micAnalyser = null;
    for (const peer of this.peers.values()) void this.sender(peer)?.replaceTrack(null);
    voiceStore.update({ transmitting: false });
  }

  // ── Push to talk / mute ────────────────────────────────────────────────────

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code !== PTT_KEY || e.repeat) return;
    const el = document.activeElement;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
    this.pttHeld = true;
    this.applyTransmit();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (e.code !== PTT_KEY) return;
    this.pttHeld = false;
    this.applyTransmit();
  };

  /** A key released while the tab was in the background never fires keyup. */
  private onBlur = () => {
    this.pttHeld = false;
    this.applyTransmit();
  };

  private applyTransmit = () => {
    const s = this.state;
    const live = !!this.mic && s.joined && this.canSpeak && (s.mode === "ptt" ? this.pttHeld : !s.selfMuted);
    this.mic?.getAudioTracks().forEach((t) => (t.enabled = live));
    if (s.transmitting !== live) voiceStore.update({ transmitting: live });
  };

  // ── Peers ──────────────────────────────────────────────────────────────────

  private setPeers(list: VoicePeer[]) {
    const wanted = new Map(list.map((p) => [p.sessionId, p]));

    for (const id of [...this.peers.keys()]) {
      if (!wanted.has(id)) this.closePeer(id);
    }
    for (const info of list) {
      const peer = this.peers.get(info.sessionId);
      if (peer) {
        peer.info = info;
        this.applyPeerVolume(peer);
      } else if (this.state.joined) {
        this.openPeer(info);
      }
    }
    this.publishPeers();
  }

  private openPeer(info: VoicePeer) {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const peer: Peer = {
      info,
      pc,
      pending: [],
      stream: null,
      element: null,
      audio: null,
      avatar: null,
      analyser: null,
      analyserSource: null,
      makingOffer: false,
    };
    this.peers.set(info.sessionId, peer);

    pc.onicecandidate = (e) => {
      if (e.candidate) this.signal(info.sessionId, { type: "candidate", candidate: e.candidate.toJSON() as any });
    };
    pc.ontrack = (e) => this.attachStream(peer, e.streams[0] ?? new MediaStream([e.track]));
    pc.onconnectionstatechange = () => {
      // The offerer recovers a dropped connection; the other side waits for it.
      if (pc.connectionState === "failed" && peer.info.initiator) pc.restartIce();
      this.publishPeers();
    };

    if (info.initiator) {
      // One audio slot both ways. The mic is swapped in and out with replaceTrack,
      // which needs no new handshake.
      const transceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
      if (this.mic) void transceiver.sender.replaceTrack(this.mic.getAudioTracks()[0]);
      pc.onnegotiationneeded = async () => {
        try {
          peer.makingOffer = true;
          await pc.setLocalDescription();
          this.signal(info.sessionId, { type: "description", sdp: pc.localDescription!.toJSON() as any });
        } catch (err) {
          console.warn("[Voice] Offer failed:", (err as Error).message);
        } finally {
          peer.makingOffer = false;
        }
      };
    }
  }

  private sender(peer: Peer): RTCRtpSender | null {
    return peer.pc.getTransceivers()[0]?.sender ?? null;
  }

  private async onSignal(from: string, signal: VoiceSignal) {
    const peer = this.peers.get(from);
    if (!peer) return;
    const { pc } = peer;

    try {
      if (signal.type === "description") {
        // Offers only ever come from the initiator, so there's no offer collision to resolve.
        if (signal.sdp.type === "offer" && peer.info.initiator) return;
        await pc.setRemoteDescription(signal.sdp);
        if (signal.sdp.type === "offer") {
          const transceiver = pc.getTransceivers()[0];
          if (transceiver) {
            transceiver.direction = "sendrecv";
            if (this.mic) await transceiver.sender.replaceTrack(this.mic.getAudioTracks()[0]);
          }
          await pc.setLocalDescription();
          this.signal(from, { type: "description", sdp: pc.localDescription!.toJSON() as any });
        }
        for (const candidate of peer.pending.splice(0)) await pc.addIceCandidate(candidate);
      } else if (pc.remoteDescription) {
        await pc.addIceCandidate(signal.candidate);
      } else {
        peer.pending.push(signal.candidate);
      }
    } catch (err) {
      console.warn("[Voice] Handshake with", from, "failed:", (err as Error).message);
    }
  }

  private signal(to: string, signal: VoiceSignal) {
    this.room.send(VOICE_SIGNAL_MESSAGE, { to, signal } satisfies VoiceSignalOut);
  }

  private attachStream(peer: Peer, stream: MediaStream) {
    if (peer.stream === stream) return;
    this.detachAudio(peer);
    peer.stream = stream;

    const element = new Audio();
    element.srcObject = stream;
    element.muted = true;
    void element.play().catch(() => {});
    peer.element = element;

    const ctx = audioListener.context;
    peer.analyser = ctx.createAnalyser();
    peer.analyser.fftSize = 512;
    peer.analyserSource = ctx.createMediaStreamSource(stream);
    peer.analyserSource.connect(peer.analyser);

    this.attachToAvatar(peer);
  }

  /** Play the voice from the speaker's avatar. Avatars stream in with chunks, so this retries. */
  private attachToAvatar(peer: Peer) {
    if (!peer.stream) return;
    const avatar = this.space.components?.byId(`player-${peer.info.sessionId}`) as any;
    if (peer.audio && peer.avatar === avatar) return;
    if (peer.audio) {
      peer.audio.disconnect();
      peer.audio.removeFromParent();
      peer.audio = null;
    }
    peer.avatar = avatar;
    if (!avatar?.add) return;

    const audio = new PositionalAudio(audioListener);
    audio.setMediaStreamSource(peer.stream);
    audio.setDistanceModel("linear");
    audio.setRefDistance(VOICE_REF_DISTANCE);
    audio.setMaxDistance(VOICE_HEARING_RANGE);
    audio.setRolloffFactor(1);
    audio.position.set(0, 1.6, 0); // mouth height
    avatar.add(audio);
    peer.audio = audio;
    this.applyPeerVolume(peer);
  }

  private applyPeerVolume(peer: Peer) {
    peer.audio?.setVolume(peer.info.canSpeak ? 1 : 0);
  }

  private detachAudio(peer: Peer) {
    if (peer.audio) {
      peer.audio.disconnect();
      peer.audio.removeFromParent();
      peer.audio = null;
    }
    peer.avatar = null;
    peer.analyserSource?.disconnect();
    peer.analyserSource = null;
    peer.analyser = null;
    if (peer.element) {
      peer.element.srcObject = null;
      peer.element = null;
    }
    peer.stream = null;
  }

  private closePeer(id: string) {
    const peer = this.peers.get(id);
    if (!peer) return;
    this.detachAudio(peer);
    peer.pc.close();
    this.peers.delete(id);
  }

  private publishPeers() {
    const peers: VoiceState["peers"] = {};
    for (const [id, peer] of this.peers) {
      const s = peer.pc.connectionState;
      peers[id] = s === "connected" ? "connected" : s === "failed" ? "failed" : "connecting";
    }
    setVoicePeers(peers);
  }

  // ── Activity ───────────────────────────────────────────────────────────────

  private tick = () => {
    // The listener has to ride on the camera for distance to mean anything.
    if (Camera.current && audioListener.parent !== Camera.current) Camera.current.add(audioListener);

    const speaking: Record<string, boolean> = {};
    let level = 0;

    if (this.micAnalyser) {
      const r = rms(this.micAnalyser, this.buffer);
      level = Math.min(1, r * 8);
      if (this.state.transmitting && r > SPEAKING_THRESHOLD) speaking[this.room.sessionId] = true;
    }

    for (const [id, peer] of this.peers) {
      this.attachToAvatar(peer);
      if (peer.analyser && peer.info.canSpeak && rms(peer.analyser, this.buffer) > SPEAKING_THRESHOLD) {
        speaking[id] = true;
      }
    }
    setVoiceActivity(level, speaking);
  };

  dispose(): void {
    this.leave();
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.unsubscribers.forEach((off) => off());
    this.unsubscribers = [];
  }
}
