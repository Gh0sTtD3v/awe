import { MapSchema, Schema, type } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("string") sessionId: string = "";
  /** Username from the player's profile. Empty when signed out or not set. */
  @type("string") name: string = "";
  /** Profile picture URL. Empty when there's none. */
  @type("string") avatar: string = "";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("float32") z: number = 0;
  @type("float32") rotY: number = 0;
  @type("string") anim: string = "idle";
  @type("float64") updatedAt: number = 0;
  /** The player's highest role, for the Players list. Empty name = only `everyone`. */
  @type("string") roleId: string = "everyone";
  @type("string") roleName: string = "";
  @type("string") roleColor: string = "";
  /** Rank used for moderation: higher outranks lower; the owner is highest. */
  @type("float64") rolePosition: number = 0;
  /** In voice chat. */
  @type("boolean") inVoice: boolean = false;
  /** Silenced in voice by a moderator (for this session). */
  @type("boolean") voiceMuted: boolean = false;
  /** Live: heard at full volume by everyone outside rooms in the same chunk. */
  @type("boolean") broadcasting: boolean = false;
}

export class GameState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}
