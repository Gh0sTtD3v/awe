import { Camera, type Space } from "@oncyberio/engine";
import { CanvasTexture, LinearFilter, SRGBColorSpace, Sprite, SpriteMaterial, Vector3 } from "three";
import type { ChatMessage } from "../../shared/messages";

/** Height above the avatar's feet, in metres. */
const HEAD_OFFSET = 2.35;
/** Bubbles further than this from the camera aren't drawn. */
const VISIBLE_RANGE = 35;
/** World height of one line of text, in metres. */
const LINE_HEIGHT = 0.16;
const MAX_LINE_CHARS = 28;
const MAX_LINES = 4;
const FADE_S = 0.25;

const FONT_PX = 40;
const PAD_X = 28;
const PAD_Y = 18;
const TAIL = 14;

const _avatarPos = new Vector3();
const _camPos = new Vector3();

interface Bubble {
  sprite: Sprite;
  texture: CanvasTexture;
  age: number;
  life: number;
}

/** Word-wrap to at most MAX_LINES lines, ellipsising the rest. */
function wrap(text: string): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    // Words longer than a line are cut into pieces.
    for (let rest = word; rest; rest = rest.slice(MAX_LINE_CHARS)) {
      const piece = rest.slice(0, MAX_LINE_CHARS);
      if (!line) line = piece;
      else if (line.length + 1 + piece.length <= MAX_LINE_CHARS) line += ` ${piece}`;
      else {
        lines.push(line);
        line = piece;
      }
    }
  }
  if (line) lines.push(line);
  if (lines.length > MAX_LINES) {
    lines.length = MAX_LINES;
    lines[MAX_LINES - 1] = `${lines[MAX_LINES - 1].slice(0, MAX_LINE_CHARS - 1)}…`;
  }
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A rounded speech bubble with a tail pointing down at the speaker. */
function drawBubble(text: string): { canvas: HTMLCanvasElement } {
  const lines = wrap(text);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const font = `500 ${FONT_PX}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.font = font;

  const lineH = Math.round(FONT_PX * 1.25);
  const textW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const w = Math.ceil(textW + PAD_X * 2);
  const h = lineH * lines.length + PAD_Y * 2;
  canvas.width = w;
  canvas.height = h + TAIL;

  ctx.font = font; // resizing the canvas resets its state
  ctx.fillStyle = "rgba(14, 14, 14, 0.82)";
  roundRect(ctx, 0, 0, w, h, Math.min(28, h / 2));
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w / 2 - TAIL, h);
  ctx.lineTo(w / 2, h + TAIL);
  ctx.lineTo(w / 2 + TAIL, h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((l, i) => ctx.fillText(l, w / 2, PAD_Y + lineH * (i + 0.5)));
  return { canvas };
}

/**
 * Speech bubbles over players' heads when they chat. One bubble per player:
 * a new message replaces the last. They face the camera, follow the avatar
 * and fade out after a few seconds.
 */
export class ChatBubbles {
  private bubbles = new Map<string, Bubble>();

  constructor(private space: Space) {}

  show(message: ChatMessage) {
    this.remove(message.sessionId);

    const { canvas } = drawBubble(message.text);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearFilter;
    texture.generateMipmaps = false;

    const material = new SpriteMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false, fog: false, opacity: 0 });
    const sprite = new Sprite(material);
    // Same text size for every bubble: one line of text is LINE_HEIGHT metres.
    const metresPerPx = LINE_HEIGHT / Math.round(FONT_PX * 1.25);
    sprite.scale.set(canvas.width * metresPerPx, canvas.height * metresPerPx, 1);
    sprite.center.set(0.5, 0); // anchored at the tail
    sprite.renderOrder = 10;
    sprite.visible = false;
    this.space.scene.add(sprite);

    // Long messages stay up longer.
    const life = Math.min(10, 5 + message.text.length * 0.04);
    this.bubbles.set(message.sessionId, { sprite, texture, age: 0, life });
  }

  update(dt: number) {
    if (this.bubbles.size === 0) return;
    Camera.current?.getWorldPosition(_camPos);

    for (const [sessionId, b] of this.bubbles) {
      b.age += dt;
      if (b.age >= b.life) {
        this.remove(sessionId);
        continue;
      }
      const avatar = this.space.components?.byId(`player-${sessionId}`) as any;
      if (!avatar?.getWorldPosition) {
        b.sprite.visible = false;
        continue;
      }
      avatar.getWorldPosition(_avatarPos);
      b.sprite.position.set(_avatarPos.x, _avatarPos.y + HEAD_OFFSET, _avatarPos.z);
      b.sprite.visible = _avatarPos.distanceTo(_camPos) <= VISIBLE_RANGE;
      b.sprite.material.opacity = Math.min(1, b.age / FADE_S, (b.life - b.age) / FADE_S);
    }
  }

  remove(sessionId: string) {
    const b = this.bubbles.get(sessionId);
    if (!b) return;
    b.sprite.removeFromParent();
    b.sprite.material.dispose();
    b.texture.dispose();
    this.bubbles.delete(sessionId);
  }

  dispose() {
    for (const id of [...this.bubbles.keys()]) this.remove(id);
  }
}
